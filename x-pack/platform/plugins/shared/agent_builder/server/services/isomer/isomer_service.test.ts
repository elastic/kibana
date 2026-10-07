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
import { loggerMock } from '@kbn/logging-mocks';
import type { AttachmentServiceStart } from '../attachments';
import { IsomerServiceImpl } from './isomer_service';

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

const renderProjection = (
  event: RoundCompleteEvent,
  attachmentsService: AttachmentServiceStart = unmappedAttachmentsService
) =>
  new IsomerServiceImpl({ attachmentsService, logger: loggerMock.create() }).renderProjection(
    event,
    {
      originType: ConversationOriginType.Slack,
    }
  );

describe('renderProjection', () => {
  it('renders the projection of the round origin', () => {
    const projection = renderProjection(createRoundCompleteEvent('Hello'));

    expect(projection?.slack?.text).toBe('Hello');
  });

  it('renders mapped attachments in place of their tags', () => {
    const event = createRoundCompleteEvent(
      'Here is the query:\n\n<render_attachment id="a1" version="1" />',
      [esqlAttachment]
    );
    const attachmentsService = {
      getTypeDefinition: () => ({
        toSpec: (data: { query: string }) => ({
          type: 'view',
          body: [{ type: 'markdown', text: `\`${data.query}\`` }],
        }),
      }),
    } as unknown as AttachmentServiceStart;

    const slack = JSON.stringify(renderProjection(event, attachmentsService)?.slack);

    expect(slack).toContain('FROM logs | LIMIT 10');
    expect(slack).not.toContain('render_attachment');
  });

  it('leaves out unmapped attachments', () => {
    const event = createRoundCompleteEvent('Here: <render_attachment id="a1" />', [esqlAttachment]);

    const slack = JSON.stringify(renderProjection(event)?.slack);

    expect(slack).toContain('Here:');
    expect(slack).not.toContain('Latest logs');
    expect(slack).not.toContain('render_attachment');
  });

  it('renders nothing when rendering fails', () => {
    jest.mocked(isomerSlack.renderSlackEnvelope).mockImplementationOnce(() => {
      throw new Error('boom');
    });

    expect(renderProjection(createRoundCompleteEvent('Hello'))).toBeUndefined();
  });

  it('renders nothing when the message is empty', () => {
    expect(renderProjection(createRoundCompleteEvent(''))).toBeUndefined();
  });

  it('renders nothing when none of the message can be rendered', () => {
    const event = createRoundCompleteEvent('<render_attachment id="a1" />', [esqlAttachment]);

    expect(renderProjection(event)).toBeUndefined();
  });

  it('renders nothing for rounds without an origin', () => {
    const isomerService = new IsomerServiceImpl({
      attachmentsService: unmappedAttachmentsService,
      logger: loggerMock.create(),
    });

    expect(
      isomerService.renderProjection(createRoundCompleteEvent('Hello'), { originType: undefined })
    ).toBeUndefined();
  });
});
