/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unset } from 'lodash';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AttachmentService } from '.';
import {
  externalReferenceAttachmentES,
  externalReferenceAttachmentESAttributes,
  externalReferenceAttachmentSO,
  externalReferenceAttachmentSOAttributes,
  externalReferenceAttachmentSOAttributesWithoutRefs,
  createPersistableStateAttachmentTypeRegistryMock,
  persistableStateAttachment,
  persistableStateAttachmentAttributes,
  persistableStateAttachmentAttributesWithoutInjectedId,
} from '../../attachment_framework/mocks';
import { createAlertAttachment, createUserAttachment } from './test_utils';
import { createErrorSO, createSOFindResponse } from '../test_utils';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import type { ConfigType } from '../../config';

const createAttachmentServiceConfig = (attachmentsEnabled = false): ConfigType =>
  ({ attachments: { enabled: attachmentsEnabled } } as ConfigType);

const owner = SECURITY_SOLUTION_OWNER;

describe('AttachmentService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();
  const persistableStateAttachmentTypeRegistry = createPersistableStateAttachmentTypeRegistryMock();
  let service: AttachmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttachmentService({
      log: mockLogger,
      persistableStateAttachmentTypeRegistry,
      unsecuredSavedObjectsClient,
      config: createAttachmentServiceConfig(),
    });
  });

  describe('create', () => {
    describe('Decoding', () => {
      it('does not throw when the response and the request has the required fields', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue(createUserAttachment());

        await expect(
          service.create({
            attributes: createUserAttachment().attributes,
            references: [],
            id: '1',
            owner,
          })
        ).resolves.not.toThrow();
      });

      it('strips excess fields from the response', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue(createUserAttachment({ foo: 'bar' }));

        const res = await service.create({
          attributes: createUserAttachment().attributes,
          references: [],
          id: '1',
          owner,
        });

        expect(res).toStrictEqual(createUserAttachment());
      });

      it('throws when the response is missing the attributes.comment', async () => {
        const invalidAttachment = createUserAttachment();
        unset(invalidAttachment, 'attributes.comment');

        unsecuredSavedObjectsClient.create.mockResolvedValue(invalidAttachment);

        await expect(
          service.create({
            attributes: createUserAttachment().attributes,
            references: [],
            id: '1',
            owner,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"user\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"eventId\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceMetadata\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceStorage\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\""`
        );
      });

      it('throws when the request is missing the attributes.comment', async () => {
        const invalidAttachment = createUserAttachment();
        unset(invalidAttachment, 'attributes.comment');

        unsecuredSavedObjectsClient.create.mockResolvedValue(createUserAttachment());

        await expect(
          service.create({
            attributes: invalidAttachment.attributes,
            references: [],
            id: '1',
            owner,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"user\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"eventId\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceMetadata\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceStorage\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\",Invalid value \\"undefined\\" supplied to \\"attachmentId\\",Invalid value \\"undefined\\" supplied to \\"data\\""`
        );
      });

      it('strips excess fields from the request', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue(createUserAttachment());

        await service.create({
          // @ts-expect-error: excess attributes
          attributes: { ...createUserAttachment().attributes, foo: 'bar' },
          references: [],
          id: '1',
          owner,
        });

        const persistedAttributes = unsecuredSavedObjectsClient.create.mock.calls[0][1];
        expect(persistedAttributes).not.toHaveProperty('foo');
      });
    });
  });

  describe('bulkCreate', () => {
    describe('Decoding', () => {
      it('does not throw when the response and the request has the required fields', async () => {
        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [createUserAttachment()],
        });

        await expect(
          service.bulkCreate({
            attachments: [
              { attributes: createUserAttachment().attributes, references: [], id: '1' },
            ],
            owner,
          })
        ).resolves.not.toThrow();
      });

      it('returns error objects unmodified', async () => {
        const userAttachment = createUserAttachment({ foo: 'bar' });

        const errorResponseObj = createErrorSO(CASE_COMMENT_SAVED_OBJECT);

        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          // @ts-expect-error: SO client types are wrong
          saved_objects: [errorResponseObj, userAttachment],
        });

        const res = await service.bulkCreate({
          attachments: [
            { attributes: createUserAttachment().attributes, references: [], id: '1' },
            { attributes: createUserAttachment().attributes, references: [], id: '1' },
          ],
          owner,
        });

        expect(res).toStrictEqual({ saved_objects: [errorResponseObj, createUserAttachment()] });
      });

      it('strips excess fields', async () => {
        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [createUserAttachment({ foo: 'bar' })],
        });

        const res = await service.bulkCreate({
          attachments: [{ attributes: createUserAttachment().attributes, references: [], id: '1' }],
          owner,
        });

        expect(res).toStrictEqual({ saved_objects: [createUserAttachment()] });
      });

      it('throws when the response is missing the attributes.comment field', async () => {
        const invalidAttachment = createUserAttachment();
        unset(invalidAttachment, 'attributes.comment');

        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [invalidAttachment],
        });

        await expect(
          service.bulkCreate({
            attachments: [
              { attributes: createUserAttachment().attributes, references: [], id: '1' },
            ],
            owner,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"user\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"eventId\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceMetadata\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceStorage\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\""`
        );
      });

      it('throws when the request is missing the attributes.comment', async () => {
        const invalidAttachment = createUserAttachment();
        unset(invalidAttachment, 'attributes.comment');

        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [createUserAttachment()],
        });

        await expect(
          service.bulkCreate({
            attachments: [{ attributes: invalidAttachment.attributes, references: [], id: '1' }],
            owner,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"user\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"eventId\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceMetadata\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceStorage\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\",Invalid value \\"undefined\\" supplied to \\"attachmentId\\",Invalid value \\"undefined\\" supplied to \\"data\\""`
        );
      });

      it('strips excess fields from the request', async () => {
        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [createUserAttachment()],
        });

        await service.bulkCreate({
          attachments: [
            {
              // @ts-expect-error: excess attributes
              attributes: { ...createUserAttachment().attributes, foo: 'bar' },
              references: [],
              id: '1',
            },
          ],
          owner,
        });

        const persistedAttributes = unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0][0];
        expect(persistedAttributes.attributes).not.toHaveProperty('foo');
      });
    });
  });

  describe('feature flag (config.attachments.enabled)', () => {
    it('when enabled, create writes to CASE_ATTACHMENT_SAVED_OBJECT with unified attributes', async () => {
      const serviceWithFlagOn = new AttachmentService({
        log: mockLogger,
        persistableStateAttachmentTypeRegistry,
        unsecuredSavedObjectsClient,
        config: createAttachmentServiceConfig(true),
      });
      const unifiedAttrs = {
        type: 'comment',
        data: { content: 'hello' },
        created_at: '2024-01-01T00:00:00.000Z',
        created_by: { username: 'u', full_name: null, email: null },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      };
      unsecuredSavedObjectsClient.create.mockResolvedValue({
        id: '1',
        type: CASE_ATTACHMENT_SAVED_OBJECT,
        attributes: unifiedAttrs,
        references: [],
      });

      await serviceWithFlagOn.create({
        attributes: unifiedAttrs,
        references: [],
        id: '1',
        owner,
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        CASE_ATTACHMENT_SAVED_OBJECT,
        expect.objectContaining({ type: 'comment', data: { content: 'hello' } }),
        expect.any(Object)
      );
    });

    it('when disabled, create writes to CASE_COMMENT_SAVED_OBJECT with legacy attributes', async () => {
      unsecuredSavedObjectsClient.create.mockResolvedValue(createUserAttachment());

      await service.create({
        attributes: createUserAttachment().attributes,
        references: [],
        id: '1',
        owner,
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        CASE_COMMENT_SAVED_OBJECT,
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('when enabled, bulkCreate writes to CASE_ATTACHMENT_SAVED_OBJECT', async () => {
      const serviceWithFlagOn = new AttachmentService({
        log: mockLogger,
        persistableStateAttachmentTypeRegistry,
        unsecuredSavedObjectsClient,
        config: createAttachmentServiceConfig(true),
      });
      const unifiedAttrs = {
        type: 'comment',
        data: { content: 'hi' },
        created_at: '2024-01-01T00:00:00.000Z',
        created_by: { username: 'u', full_name: null, email: null },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      };
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          { id: '1', type: CASE_ATTACHMENT_SAVED_OBJECT, attributes: unifiedAttrs, references: [] },
        ],
      });

      await serviceWithFlagOn.bulkCreate({
        attachments: [{ attributes: unifiedAttrs, references: [], id: '1' }],
        refresh: false,
        owner,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: CASE_ATTACHMENT_SAVED_OBJECT,
            attributes: expect.objectContaining({ type: 'comment', data: { content: 'hi' } }),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('when disabled, bulkCreate writes to CASE_COMMENT_SAVED_OBJECT', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [createUserAttachment()],
      });

      await service.bulkCreate({
        attachments: [{ attributes: createUserAttachment().attributes, references: [], id: '1' }],
        owner,
        refresh: false,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ type: CASE_COMMENT_SAVED_OBJECT })]),
        expect.any(Object)
      );
    });
  });

  describe('update', () => {
    const soClientRes = {
      id: '1',
      attributes: persistableStateAttachmentAttributesWithoutInjectedId,
      references: [],
      version: 'test',
      type: 'cases-comments',
    };

    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockImplementation((type: string, id: string) => {
        if (type === CASE_ATTACHMENT_SAVED_OBJECT) {
          return Promise.reject(Object.assign(new Error('Not found'), { statusCode: 404 }));
        }
        if (type === CASE_COMMENT_SAVED_OBJECT) {
          return Promise.resolve(createUserAttachment());
        }
        return Promise.reject(new Error('Unknown type'));
      });
    });

    it('should inject the references to the attributes correctly (persistable state)', async () => {
      unsecuredSavedObjectsClient.update.mockResolvedValue(soClientRes);

      const res = await service.update({
        attachmentId: '1',
        updatedAttributes: persistableStateAttachment,
        options: { references: [] },
        owner,
      });

      expect(res).toEqual({ ...soClientRes, attributes: persistableStateAttachmentAttributes });
    });

    it('should inject the references to the attributes correctly (external reference savedObject)', async () => {
      unsecuredSavedObjectsClient.update.mockResolvedValue({
        ...soClientRes,
        attributes: externalReferenceAttachmentSOAttributesWithoutRefs,
      });

      const res = await service.update({
        attachmentId: '1',
        updatedAttributes: externalReferenceAttachmentSO,
        options: { references: [] },
        owner,
      });

      expect(res).toEqual({ ...soClientRes, attributes: externalReferenceAttachmentSOAttributes });
    });

    it('should inject the references to the attributes correctly (external reference elasticSearchDoc)', async () => {
      unsecuredSavedObjectsClient.update.mockResolvedValue({
        ...soClientRes,
        attributes: externalReferenceAttachmentESAttributes,
      });

      const res = await service.update({
        attachmentId: '1',
        updatedAttributes: externalReferenceAttachmentESAttributes,
        options: { references: [] },
        owner,
      });

      expect(res).toEqual({ ...soClientRes, attributes: externalReferenceAttachmentESAttributes });
    });

    describe('Decoding', () => {
      it('does not throw when the response and the request has the required fields', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(createUserAttachment());

        await expect(
          service.update({
            updatedAttributes: createUserAttachment().attributes,
            attachmentId: '1',
            owner,
          })
        ).resolves.not.toThrow();
      });

      it('strips excess fields', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(createUserAttachment({ foo: 'bar' }));

        const res = await service.update({
          updatedAttributes: createUserAttachment().attributes,
          attachmentId: '1',
          owner,
        });

        expect(res).toStrictEqual(createUserAttachment());
      });

      it('throws when the response is missing the attributes.rule.name', async () => {
        const invalidAttachment = createAlertAttachment();
        unset(invalidAttachment, 'attributes.rule.name');

        unsecuredSavedObjectsClient.update.mockResolvedValue(invalidAttachment);

        await expect(
          service.update({
            updatedAttributes: createAlertAttachment().attributes,
            attachmentId: '1',
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid attributes: expected attributes.rule.name for alert attachments"`
        );
      });

      it('throws when the request is missing the attributes.rule.name', async () => {
        const invalidAttachment = createAlertAttachment();
        unset(invalidAttachment, 'attributes.rule.name');

        unsecuredSavedObjectsClient.update.mockResolvedValue(createAlertAttachment());

        await expect(
          service.update({
            updatedAttributes: invalidAttachment.attributes,
            attachmentId: '1',
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid attributes: expected attributes.rule.name for alert attachments"`
        );
      });

      it('strips excess fields from the request', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(createUserAttachment());

        await service.update({
          // @ts-expect-error: excess attributes
          updatedAttributes: { ...createUserAttachment().attributes, foo: 'bar' },
          attachmentId: '1',
        });

        const persistedAttributes = unsecuredSavedObjectsClient.update.mock.calls[0][2];
        expect(persistedAttributes).not.toHaveProperty('foo');
      });
    });
  });

  describe('bulkUpdate', () => {
    const soClientRes = {
      id: '1',
      attributes: persistableStateAttachmentAttributesWithoutInjectedId,
      references: [],
      version: 'test',
      type: 'cases-comments',
    };

    it('should inject the references to the attributes correctly (persistable state)', async () => {
      unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          soClientRes,
          {
            ...soClientRes,
            attributes: externalReferenceAttachmentSOAttributesWithoutRefs,
          },
          {
            ...soClientRes,
            attributes: externalReferenceAttachmentESAttributes,
          },
        ],
      });

      const res = await service.bulkUpdate({
        comments: [
          {
            attachmentId: '1',
            updatedAttributes: persistableStateAttachment,
            options: { references: [] },
          },
          {
            attachmentId: '2',
            updatedAttributes: externalReferenceAttachmentSO,
            options: { references: [] },
          },
          {
            attachmentId: '3',
            updatedAttributes: externalReferenceAttachmentES,
            options: { references: [] },
          },
        ],
        owner,
      });

      expect(res).toEqual({
        saved_objects: [
          { ...soClientRes, attributes: persistableStateAttachmentAttributes },
          { ...soClientRes, attributes: externalReferenceAttachmentSOAttributes },
          { ...soClientRes, attributes: externalReferenceAttachmentESAttributes },
        ],
      });
    });

    describe('Decoding', () => {
      it('does not throw when the response and the request has the required fields', async () => {
        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [createUserAttachment()],
        });

        const updatedAttributes = createUserAttachment().attributes;

        await expect(
          service.bulkUpdate({ comments: [{ attachmentId: '1', updatedAttributes }], owner })
        ).resolves.not.toThrow();
      });

      it('returns error objects unmodified', async () => {
        const userAttachment = createUserAttachment({ foo: 'bar' });

        const errorResponseObj = createErrorSO(CASE_COMMENT_SAVED_OBJECT);

        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          // @ts-expect-error: SO client types are wrong
          saved_objects: [errorResponseObj, userAttachment],
        });

        const res = await service.bulkUpdate({
          comments: [
            { attachmentId: '1', updatedAttributes: userAttachment.attributes },
            { attachmentId: '1', updatedAttributes: userAttachment.attributes },
          ],
          owner,
        });

        expect(res).toStrictEqual({ saved_objects: [errorResponseObj, createUserAttachment()] });
      });

      it('strips excess fields', async () => {
        const updatedAttributes = createUserAttachment().attributes;

        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [createUserAttachment({ foo: 'bar' })],
        });

        const res = await service.bulkUpdate({
          comments: [{ attachmentId: '1', updatedAttributes }],
          owner,
        });

        expect(res).toStrictEqual({ saved_objects: [createUserAttachment()] });
      });

      it('throws when the response is missing the attributes.rule.name field', async () => {
        const invalidAttachment = createAlertAttachment();
        unset(invalidAttachment, 'attributes.rule.name');

        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [invalidAttachment],
        });

        const updatedAttributes = createAlertAttachment().attributes;

        await expect(
          service.bulkUpdate({ comments: [{ attachmentId: '1', updatedAttributes }], owner })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid attributes: expected attributes.rule.name for alert attachments"`
        );
      });

      it('throws when the request is missing the attributes.rule.name', async () => {
        const invalidAttachment = createAlertAttachment();
        unset(invalidAttachment, 'attributes.rule.name');

        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [createAlertAttachment()],
        });

        await expect(
          service.bulkUpdate({
            comments: [
              {
                updatedAttributes: invalidAttachment.attributes,
                attachmentId: '1',
              },
            ],

            owner,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid attributes: expected attributes.rule.name for alert attachments"`
        );
      });

      it('strips excess fields from the request', async () => {
        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [createUserAttachment()],
        });

        await service.bulkUpdate({
          comments: [
            {
              // @ts-expect-error: excess attributes
              updatedAttributes: { ...createUserAttachment().attributes, foo: 'bar' },
              attachmentId: '1',
            },
          ],
        });

        const persistedAttributes =
          unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0][0].attributes;

        expect(persistedAttributes).not.toHaveProperty('foo');
      });
    });
  });

  describe('bulkDelete', () => {
    it('calls bulkDelete with both CASE_ATTACHMENT_SAVED_OBJECT and CASE_COMMENT_SAVED_OBJECT for each id', async () => {
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({ statuses: [] });

      await service.bulkDelete({ attachmentIds: ['id-1', 'id-2'], refresh: false });

      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
      const [deleteRequests] = unsecuredSavedObjectsClient.bulkDelete.mock.calls[0];
      expect(deleteRequests).toHaveLength(4);
      const byId = (deleteRequests as Array<{ id: string; type: string }>).reduce((acc, r) => {
        if (!acc[r.id]) acc[r.id] = [];
        acc[r.id].push(r.type);
        return acc;
      }, {} as Record<string, string[]>);
      expect(byId['id-1']).toEqual(
        expect.arrayContaining([CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT])
      );
      expect(byId['id-2']).toEqual(
        expect.arrayContaining([CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT])
      );
    });
  });

  describe('find', () => {
    describe('Decoding', () => {
      it('does not throw when the response has the required fields', async () => {
        unsecuredSavedObjectsClient.find.mockResolvedValue(
          createSOFindResponse([{ ...createUserAttachment(), score: 0 }])
        );

        await expect(service.find({})).resolves.not.toThrow();
      });

      it('strips excess fields', async () => {
        unsecuredSavedObjectsClient.find.mockResolvedValue(
          createSOFindResponse([{ ...createUserAttachment({ foo: 'bar' }), score: 0 }])
        );

        const res = await service.find({});

        expect(res).toStrictEqual(createSOFindResponse([{ ...createUserAttachment(), score: 0 }]));
      });

      it('throws when the response is missing the attributes.rule.name field', async () => {
        const invalidAttachment = createUserAttachment();
        unset(invalidAttachment, 'attributes.comment');

        unsecuredSavedObjectsClient.find.mockResolvedValue(
          createSOFindResponse([{ ...invalidAttachment, score: 0 }])
        );

        await expect(service.find({})).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"user\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"eventId\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceMetadata\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceStorage\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\""`
        );
      });
    });
  });

  describe('countPersistableStateAndExternalReferenceAttachments', () => {
    it('does not throw and calls unsecuredSavedObjectsClient.find with the right parameters', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValue(
        createSOFindResponse([{ ...createUserAttachment(), score: 0 }])
      );

      await expect(
        service.countPersistableStateAndExternalReferenceAttachments({ caseId: 'test-id' })
      ).resolves.not.toThrow();

      expect(unsecuredSavedObjectsClient.find.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "filter": Object {
            "arguments": Array [
              Object {
                "arguments": Array [
                  Object {
                    "arguments": Array [
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "cases-comments.attributes.type",
                      },
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "persistableState",
                      },
                    ],
                    "function": "is",
                    "type": "function",
                  },
                  Object {
                    "arguments": Array [
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "cases-comments.attributes.type",
                      },
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "externalReference",
                      },
                    ],
                    "function": "is",
                    "type": "function",
                  },
                ],
                "function": "or",
                "type": "function",
              },
              Object {
                "arguments": Array [
                  Object {
                    "arguments": Array [
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "cases-comments.attributes.externalReferenceAttachmentTypeId",
                      },
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": ".files",
                      },
                    ],
                    "function": "is",
                    "type": "function",
                  },
                ],
                "function": "not",
                "type": "function",
              },
            ],
            "function": "and",
            "type": "function",
          },
          "hasReference": Object {
            "id": "test-id",
            "type": "cases",
          },
          "page": 1,
          "perPage": 1,
          "sortField": "created_at",
          "type": "cases-comments",
        }
      `);
    });

    it('returns the expected total', async () => {
      const total = 3;

      unsecuredSavedObjectsClient.find.mockResolvedValue(
        createSOFindResponse(
          Array(total).fill({ ...createUserAttachment({ foo: 'bar' }), score: 0 })
        )
      );

      const res = await service.countPersistableStateAndExternalReferenceAttachments({
        caseId: 'test-id',
      });

      expect(res).toBe(total);
    });
  });
});
