/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as isomerSlack from '@elastic/isomer-sdk/slack';
import {
  ChatEventType,
  ConversationOriginType,
  ConversationRoundStatus,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { AttachmentServiceStart } from '../attachments';
import { SurfacesServiceImpl } from './surfaces_service';

jest.mock('@elastic/isomer-sdk/slack', () => ({
  ...jest.requireActual('@elastic/isomer-sdk/slack'),
  renderSlackEnvelope: jest.fn(jest.requireActual('@elastic/isomer-sdk/slack').renderSlackEnvelope),
}));

const esqlAttachment: VersionedAttachment = {
  id: 'a1',
  type: 'esql',
  description: 'Latest logs',
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { query: 'FROM logs | LIMIT 10' },
      created_at: '2026-10-06T00:00:00.000Z',
      content_hash: 'hash',
    },
  ],
};

const createRoundCompleteEvent = (
  message: string,
  attachments: VersionedAttachment[] = []
): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: {
    round: {
      id: 'round-1',
      status: ConversationRoundStatus.completed,
      input: { message: 'user message' },
      response: { message },
      steps: [],
      started_at: '2026-10-06T00:00:00.000Z',
      time_to_first_token: 0,
      time_to_last_token: 0,
      model_usage: { connector_id: 'unknown', input_tokens: 0, output_tokens: 0, llm_calls: 0 },
    },
    attachments,
  },
});

const unmappedAttachmentsService = {
  getTypeDefinition: () => undefined,
} as unknown as AttachmentServiceStart;

const context = { request: httpServerMock.createKibanaRequest(), spaceId: 'space-1' };

const renderPayload = (
  event: RoundCompleteEvent,
  attachmentsService: AttachmentServiceStart = unmappedAttachmentsService
) =>
  new SurfacesServiceImpl({
    attachmentsService,
    logger: loggerMock.create(),
    isomer: isomerPluginMock.createStartContract(),
  }).renderPayload(event, { originType: ConversationOriginType.Slack, ...context });

describe('renderPayload', () => {
  it('renders the payload of the round surface', async () => {
    const payload = await renderPayload(createRoundCompleteEvent('Hello'));

    expect(payload?.text).toBe('Hello');
  });

  it('renders mapped attachments in place of their tags', async () => {
    const event = createRoundCompleteEvent(
      'Here is the query:\n\n<render_attachment id="a1" version="1" />',
      [esqlAttachment]
    );
    const toSurfaceComposition = jest.fn(async ({ data }: { data: { query: string } }) => ({
      type: 'view',
      body: [{ type: 'markdown', text: `\`${data.query}\`` }],
    }));
    const attachmentsService = {
      getTypeDefinition: () => ({ toSurfaceComposition }),
    } as unknown as AttachmentServiceStart;

    const slack = JSON.stringify(await renderPayload(event, attachmentsService));

    expect(slack).toContain('FROM logs | LIMIT 10');
    expect(slack).not.toContain('render_attachment');
    expect(toSurfaceComposition).toHaveBeenCalledWith(expect.anything(), context);
  });

  it('leaves out unmapped attachments', async () => {
    const event = createRoundCompleteEvent('Here: <render_attachment id="a1" />', [esqlAttachment]);

    const slack = JSON.stringify(await renderPayload(event));

    expect(slack).toContain('Here:');
    expect(slack).not.toContain('Latest logs');
    expect(slack).not.toContain('render_attachment');
  });

  it('renders nothing when rendering fails', async () => {
    jest.mocked(isomerSlack.renderSlackEnvelope).mockImplementationOnce(() => {
      throw new Error('boom');
    });

    await expect(renderPayload(createRoundCompleteEvent('Hello'))).resolves.toBeUndefined();
  });

  it('renders a later round after the runtime fails to load', async () => {
    const isomer = isomerPluginMock.createStartContract();
    const logger = loggerMock.create();
    isomer.getRuntime.mockRejectedValueOnce(new Error('runtime unavailable'));
    const service = new SurfacesServiceImpl({
      attachmentsService: unmappedAttachmentsService,
      logger,
      isomer,
    });
    const event = createRoundCompleteEvent('Hello');
    const options = { originType: ConversationOriginType.Slack, ...context };

    await expect(service.renderPayload(event, options)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to render the slack surface payload: runtime unavailable'
    );
    await expect(service.renderPayload(event, options)).resolves.toEqual(
      expect.objectContaining({ text: 'Hello' })
    );
  });

  it('renders nothing when the message is empty', async () => {
    await expect(renderPayload(createRoundCompleteEvent(''))).resolves.toBeUndefined();
  });

  it('renders nothing when none of the message can be rendered', async () => {
    const event = createRoundCompleteEvent('<render_attachment id="a1" />', [esqlAttachment]);

    await expect(renderPayload(event)).resolves.toBeUndefined();
  });

  it('renders nothing for rounds without an origin, without building the runtime', async () => {
    const isomer = isomerPluginMock.createStartContract();
    const surfacesService = new SurfacesServiceImpl({
      attachmentsService: unmappedAttachmentsService,
      logger: loggerMock.create(),
      isomer,
    });

    await expect(
      surfacesService.renderPayload(createRoundCompleteEvent('Hello'), {
        originType: undefined,
        ...context,
      })
    ).resolves.toBeUndefined();
    expect(isomer.getRuntime).not.toHaveBeenCalled();
  });
});
