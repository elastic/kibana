/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as isomerSlack from '@elastic/isomer-sdk/slack';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { IBasePath } from '@kbn/core/server';
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

interface Response {
  message: string;
  attachments: VersionedAttachment[];
}

const createResponse = (message: string, attachments: VersionedAttachment[] = []): Response => ({
  message,
  attachments,
});

const unmappedAttachmentsService = {
  getTypeDefinition: () => undefined,
} as unknown as AttachmentServiceStart;

const context = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'space-1',
  agentId: 'agent-1',
};

const basePath = { publicBaseUrl: 'https://kibana.example.com' } as IBasePath;

const renderPayload = (
  response: Response,
  attachmentsService: AttachmentServiceStart = unmappedAttachmentsService,
  kibanaBasePath: IBasePath = basePath
) =>
  new SurfacesServiceImpl({
    attachmentsService,
    logger: loggerMock.create(),
    isomer: isomerPluginMock.createStartContract(),
    basePath: kibanaBasePath,
    cloud: undefined,
  }).renderPayload(response, { originType: ConversationOriginType.Slack, ...context });

describe('renderPayload', () => {
  it('renders the payload of the round surface', async () => {
    const payload = await renderPayload(createResponse('Hello'));

    expect(payload?.text).toBe('Hello');
  });

  it('renders mapped attachments in place of their tags', async () => {
    const event = createResponse(
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

  describe('Kibana app links', () => {
    const event = createResponse('See: <render_attachment id="a1" />', [esqlAttachment]);
    const attachmentsService = {
      getTypeDefinition: () => ({
        toSurfaceComposition: () => ({
          type: 'view',
          body: [{ type: 'link', label: 'Open in Discover', app: 'discover', path: '#/' }],
        }),
      }),
    } as unknown as AttachmentServiceStart;

    it("resolve against the Kibana URL of the round's space", async () => {
      const slack = JSON.stringify(await renderPayload(event, attachmentsService));

      expect(slack).toContain('https://kibana.example.com/s/space-1/app/discover#/');
    });

    it('are left out when no Kibana URL resolves', async () => {
      const slack = JSON.stringify(await renderPayload(event, attachmentsService, {} as IBasePath));

      expect(slack).toContain('See:');
      expect(slack).not.toContain('Open in Discover');
    });
  });

  it('leaves out unmapped attachments', async () => {
    const event = createResponse('Here: <render_attachment id="a1" />', [esqlAttachment]);

    const slack = JSON.stringify(await renderPayload(event));

    expect(slack).toContain('Here:');
    expect(slack).not.toContain('Latest logs');
    expect(slack).not.toContain('render_attachment');
  });

  it('renders nothing when rendering fails', async () => {
    jest.mocked(isomerSlack.renderSlackEnvelope).mockImplementationOnce(() => {
      throw new Error('boom');
    });

    await expect(renderPayload(createResponse('Hello'))).resolves.toBeUndefined();
  });

  it('renders a later round after the runtime fails to load', async () => {
    const isomer = isomerPluginMock.createStartContract();
    const logger = loggerMock.create();
    isomer.getRuntime.mockRejectedValueOnce(new Error('runtime unavailable'));
    const service = new SurfacesServiceImpl({
      attachmentsService: unmappedAttachmentsService,
      logger,
      isomer,
      basePath,
      cloud: undefined,
    });
    const event = createResponse('Hello');
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
    await expect(renderPayload(createResponse(''))).resolves.toBeUndefined();
  });

  it('renders nothing when none of the message can be rendered', async () => {
    const event = createResponse('<render_attachment id="a1" />', [esqlAttachment]);

    await expect(renderPayload(event)).resolves.toBeUndefined();
  });

  it('renders nothing for rounds without an origin, without building the runtime', async () => {
    const isomer = isomerPluginMock.createStartContract();
    const surfacesService = new SurfacesServiceImpl({
      attachmentsService: unmappedAttachmentsService,
      logger: loggerMock.create(),
      isomer,
      basePath,
      cloud: undefined,
    });

    await expect(
      surfacesService.renderPayload(createResponse('Hello'), {
        originType: undefined,
        ...context,
      })
    ).resolves.toBeUndefined();
    expect(isomer.getRuntime).not.toHaveBeenCalled();
  });
});
