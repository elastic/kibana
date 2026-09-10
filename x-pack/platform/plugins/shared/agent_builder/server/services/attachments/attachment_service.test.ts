/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { isAllowedBuiltinAttachment } from '@kbn/agent-builder-server/allow_lists';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentService } from './attachment_service';

jest.mock('@kbn/agent-builder-server/allow_lists');

const isAllowedBuiltinAttachmentMock = isAllowedBuiltinAttachment as jest.MockedFunction<
  typeof isAllowedBuiltinAttachment
>;

const createMockedAttachmentType = (id = 'test-attachment'): AttachmentTypeDefinition => ({
  id,
  validate: () => ({ valid: true, data: { content: 'test' } }),
  format: () => ({ getRepresentation: () => ({ type: 'text', value: 'test' }) }),
});

describe('AttachmentService', () => {
  let service: ReturnType<typeof createAttachmentService>;

  beforeEach(() => {
    service = createAttachmentService();
  });

  afterEach(() => {
    isAllowedBuiltinAttachmentMock.mockReset();
  });

  describe('#setup', () => {
    it('allows registering allowed built-in attachment types', () => {
      isAllowedBuiltinAttachmentMock.mockReturnValue(true);

      const serviceSetup = service.setup();

      expect(() => serviceSetup.registerType(createMockedAttachmentType())).not.toThrow();
    });

    it('throws an error trying to register non-allowed built-in attachment types', () => {
      isAllowedBuiltinAttachmentMock.mockReturnValue(false);

      const serviceSetup = service.setup();

      expect(() => serviceSetup.registerType(createMockedAttachmentType()))
        .toThrowErrorMatchingInlineSnapshot(`
        "Built-in attachment with id \\"test-attachment\\" is not in the list of allowed built-in attachments.
                     Please add it to the list of allowed built-in attachments in the \\"@kbn/agent-builder-server/allow_lists.ts\\" file."
      `);
    });
  });

  describe('#start', () => {
    it('validates and normalizes attachment inputs', async () => {
      isAllowedBuiltinAttachmentMock.mockReturnValue(true);

      const serviceSetup = service.setup();
      serviceSetup.registerType({
        id: 'test-attachment',
        validate: () => ({ valid: true, data: { text: 'validated' } }),
        format: () => ({ getRepresentation: () => ({ type: 'text', value: 'test' }) }),
      });

      const serviceStart = service.start({
        savedObjects: savedObjectsServiceMock.createStartContract(),
      });
      const request = httpServerMock.createKibanaRequest();

      await expect(
        serviceStart.validate(
          [
            {
              type: 'test-attachment',
              data: { text: 'context' },
              description: 'Context attachment',
              hidden: true,
              origin: 'saved-object:1',
              group_id: 'group-1',
            },
          ],
          request
        )
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

    it('returns undefined when there are no attachment inputs', async () => {
      const serviceStart = service.start({
        savedObjects: savedObjectsServiceMock.createStartContract(),
      });
      const request = httpServerMock.createKibanaRequest();

      await expect(serviceStart.validate(undefined, request)).resolves.toBeUndefined();
    });

    it('throws an error for invalid attachment inputs', async () => {
      const serviceStart = service.start({
        savedObjects: savedObjectsServiceMock.createStartContract(),
      });
      const request = httpServerMock.createKibanaRequest();

      await expect(serviceStart.validate([{ type: 'bad', data: {} }], request)).rejects.toThrow(
        'Attachment validation failed: Unknown attachment type: bad'
      );
    });
  });
});
