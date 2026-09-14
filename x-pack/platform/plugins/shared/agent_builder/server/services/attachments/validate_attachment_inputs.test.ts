/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { isAllowedBuiltinAttachment } from '@kbn/agent-builder-server/allow_lists';
import { createAttachmentService } from './attachment_service';
import { validateAttachmentInputs } from './validate_attachment_inputs';

jest.mock('@kbn/agent-builder-server/allow_lists');

const isAllowedBuiltinAttachmentMock = isAllowedBuiltinAttachment as jest.MockedFunction<
  typeof isAllowedBuiltinAttachment
>;

const request = httpServerMock.createKibanaRequest();

const startService = () => {
  isAllowedBuiltinAttachmentMock.mockReturnValue(true);
  const service = createAttachmentService();

  service.setup().registerType({
    id: 'test-attachment',
    validate: () => ({ valid: true, data: { text: 'validated' } }),
    format: () => ({ getRepresentation: () => ({ type: 'text', value: 'test' }) }),
  });

  return service.start({ savedObjects: savedObjectsServiceMock.createStartContract() });
};

describe('validateAttachmentInputs', () => {
  it('validates and normalizes every input', async () => {
    await expect(
      validateAttachmentInputs({
        attachmentsService: startService(),
        attachments: [
          {
            type: 'test-attachment',
            data: { text: 'context' },
            description: 'Context attachment',
            hidden: true,
            origin: 'saved-object:1',
            group_id: 'group-1',
          },
        ],
        request,
      })
    ).resolves.toEqual([
      {
        id: expect.any(String),
        type: 'test-attachment',
        data: { text: 'validated' },
        description: 'Context attachment',
        hidden: true,
        origin: 'saved-object:1',
        group_id: 'group-1',
      },
    ]);
  });

  it('returns undefined when there are no inputs', async () => {
    await expect(
      validateAttachmentInputs({
        attachmentsService: startService(),
        attachments: undefined,
        request,
      })
    ).resolves.toBeUndefined();
  });

  it('rejects the request on the first invalid input', async () => {
    await expect(
      validateAttachmentInputs({
        attachmentsService: startService(),
        attachments: [{ type: 'bad', data: {} }],
        request,
      })
    ).rejects.toThrow('Attachment validation failed: Unknown attachment type: bad');
  });
});
