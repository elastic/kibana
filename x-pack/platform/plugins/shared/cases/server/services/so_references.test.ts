/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_SO_TYPE,
  DISCOVER_SESSION_ATTACHMENT_TYPE,
  DISCOVER_SESSION_SO_TYPE,
  LENS_ATTACHMENT_TYPE,
  LENS_SO_TYPE,
  MAP_ATTACHMENT_TYPE,
  MAP_SO_TYPE,
} from '../../common/constants/attachments';
import {
  externalReferenceAttachmentESAttributes,
  externalReferenceAttachmentSOAttributes,
  externalReferenceAttachmentSOAttributesWithoutRefs,
} from '../attachment_framework/mocks';
import {
  extractAttachmentSORefsFromAttributes,
  getUniqueReferences,
  injectAttachmentSOAttributesFromRefs,
  injectAttachmentSOAttributesFromRefsForPatch,
} from './so_references';

describe('so_references', () => {
  const references = [
    {
      id: 'my-id',
      name: 'externalReferenceId',
      type: 'test-so',
    },
  ];

  describe('getUniqueReferences', () => {
    const dupObj = { id: 'dup', name: 'test', type: 'testType' };

    const refs = [
      // Same name and type. Different id
      { id: '1', name: 'test', type: 'testType' },
      { id: '2', name: 'test', type: 'testType' },
      // Same id and type. Different name
      { id: '1', name: 'test1', type: 'testType' },
      { id: '1', name: 'test2', type: 'testType' },
      // Same id and name. Different type
      { id: '1', name: 'test', type: 'testType1' },
      { id: '1', name: 'test', type: 'testType2' },
      // Same id, name, and type with an item in the duplicates array
      dupObj,
    ];

    const duplicates = [dupObj];
    const refsWithDuplicates = [...refs, ...duplicates];

    it('should return the correct unique references', () => {
      expect(getUniqueReferences(refsWithDuplicates)).toEqual(refs);
    });
  });

  describe('injectAttachmentSOAttributesFromRefs', () => {
    it('should inject the references to the attributes correctly (external reference savedObject)', () => {
      const savedObject = {
        id: 'so-id',
        attributes: externalReferenceAttachmentSOAttributesWithoutRefs,
        references,
        version: 'so-version',
        type: 'cases-comments',
      };

      const res = injectAttachmentSOAttributesFromRefs(savedObject);

      expect(res).toEqual({
        ...savedObject,
        attributes: externalReferenceAttachmentSOAttributes,
      });
    });

    it('should inject the references to the attributes correctly (external reference elasticSearchDoc)', () => {
      const savedObject = {
        id: 'so-id',
        attributes: externalReferenceAttachmentESAttributes,
        references,
        version: 'so-version',
        type: 'cases-comments',
      };

      const res = injectAttachmentSOAttributesFromRefs(savedObject);

      expect(res).toEqual({
        ...savedObject,
        attributes: externalReferenceAttachmentESAttributes,
      });
    });

    it('passes attachmentId through unchanged for unified SO-backed attachments (inject is a no-op when attribute is already set)', () => {
      const savedObject = {
        id: 'so-id',
        attributes: {
          type: 'file',
          attachmentId: 'file-id-1',
          metadata: {
            soType: 'file',
            files: [{ name: 'foo', extension: 'png' }],
          },
          owner: 'securitySolution',
        } as never,
        references: [
          {
            id: 'file-id-1',
            name: 'attachmentId',
            type: 'file',
          },
        ],
        version: 'so-version',
        type: 'cases-attachments',
      };

      const res = injectAttachmentSOAttributesFromRefs(savedObject);

      expect((res.attributes as Record<string, unknown>).attachmentId).toBe('file-id-1');
      expect(res.references).toEqual(savedObject.references);
    });

    it('self-heals unified SO-backed rows persisted before the unified write flow kept attachmentId on attributes', () => {
      const savedObject = {
        id: 'so-id',
        attributes: {
          type: 'file',
          metadata: {
            soType: 'file',
            files: [{ name: 'foo', extension: 'png' }],
          },
          owner: 'securitySolution',
        } as never,
        references: [
          {
            id: 'file-id-1',
            name: 'attachmentId',
            type: 'file',
          },
        ],
        version: 'so-version',
        type: 'cases-attachments',
      };

      const res = injectAttachmentSOAttributesFromRefs(savedObject);

      expect((res.attributes as Record<string, unknown>).attachmentId).toBe('file-id-1');
    });
  });

  describe('injectAttachmentSOAttributesFromRefsForPatch', () => {
    it('should inject the references to the attributes correctly (external reference savedObject)', () => {
      const savedObject = {
        id: 'so-id',
        attributes: externalReferenceAttachmentSOAttributesWithoutRefs,
        references,
        version: 'so-version',
        type: 'cases-comments',
      };

      const res = injectAttachmentSOAttributesFromRefsForPatch(
        externalReferenceAttachmentSOAttributes,
        savedObject
      );

      expect(res).toEqual({
        ...savedObject,
        attributes: externalReferenceAttachmentSOAttributes,
      });
    });

    it('should inject the references to the attributes correctly (external reference elasticSearchDoc)', () => {
      const savedObject = {
        id: 'so-id',
        attributes: externalReferenceAttachmentESAttributes,
        references,
        version: 'so-version',
        type: 'cases-comments',
      };

      const res = injectAttachmentSOAttributesFromRefsForPatch(
        externalReferenceAttachmentESAttributes,
        savedObject
      );

      expect(res).toEqual({
        ...savedObject,
        attributes: externalReferenceAttachmentESAttributes,
      });
    });
  });

  describe('extractAttachmentSORefsFromAttributes', () => {
    it('should extract the references from the attributes correctly (external reference savedObject)', () => {
      const res = extractAttachmentSORefsFromAttributes(
        externalReferenceAttachmentSOAttributes,
        []
      );

      expect(res).toEqual({
        attributes: {
          ...externalReferenceAttachmentSOAttributesWithoutRefs,
        },
        references: [
          {
            id: 'my-id',
            name: 'externalReferenceId',
            type: 'test-so',
          },
        ],
        didDeleteOperation: false,
      });
    });

    it('should extract the references from the attributes correctly (external reference elasticSearchDoc)', () => {
      const res = extractAttachmentSORefsFromAttributes(
        externalReferenceAttachmentESAttributes,
        []
      );

      expect(res).toEqual({
        attributes: externalReferenceAttachmentESAttributes,
        references: [],
        didDeleteOperation: false,
      });
    });

    it('should mirror attachmentId into references for unified attachments with metadata.soType (and KEEP it on attributes)', () => {
      const unifiedSoBackedAttributes = {
        type: 'file',
        attachmentId: 'file-id-1',
        metadata: {
          soType: 'file',
          files: [{ name: 'foo', extension: 'png' }],
        },
        owner: 'securitySolution',
      };
      const res = extractAttachmentSORefsFromAttributes(unifiedSoBackedAttributes as never, []);

      expect(res.references).toEqual([
        {
          id: 'file-id-1',
          name: 'attachmentId',
          type: 'file',
        },
      ]);
      // Unified flow keeps `attachmentId` on attributes; the reference is added in parallel.
      expect((res.attributes as unknown as Record<string, unknown>).attachmentId).toBe('file-id-1');
      expect(res.didDeleteOperation).toBe(false);
    });

    it.each([
      [DASHBOARD_ATTACHMENT_TYPE, DASHBOARD_SO_TYPE],
      [DISCOVER_SESSION_ATTACHMENT_TYPE, DISCOVER_SESSION_SO_TYPE],
      [LENS_ATTACHMENT_TYPE, LENS_SO_TYPE],
      [MAP_ATTACHMENT_TYPE, MAP_SO_TYPE],
    ])('should mirror attachmentId for %s saved-object attachments', (type, soType) => {
      const res = extractAttachmentSORefsFromAttributes(
        {
          type,
          attachmentId: `${soType}-id-1`,
          metadata: {
            soType,
            title: 'Saved object title',
          },
          owner: 'securitySolution',
        } as never,
        []
      );

      expect(res.references).toEqual([
        {
          id: `${soType}-id-1`,
          name: 'attachmentId',
          type: soType,
        },
      ]);
      expect((res.attributes as unknown as Record<string, unknown>).attachmentId).toBe(
        `${soType}-id-1`
      );
      expect(res.didDeleteOperation).toBe(false);
    });

    it('should not extract attachmentId for unified attachments without metadata.soType', () => {
      const unifiedNonSoBackedAttributes = {
        type: 'security.endpoint',
        attachmentId: 'action-1',
        metadata: { command: 'isolate', targets: [] },
        owner: 'securitySolution',
      };
      const res = extractAttachmentSORefsFromAttributes(unifiedNonSoBackedAttributes as never, []);

      expect(res.references).toEqual([]);
      expect((res.attributes as unknown as Record<string, unknown>).attachmentId).toBe('action-1');
      expect(res.didDeleteOperation).toBe(false);
    });

    it('should mirror attachmentId for any unified attachment carrying metadata.soType', () => {
      const customSoBackedAttributes = {
        type: 'custom.so-backed',
        attachmentId: 'custom-so-id',
        metadata: { soType: 'custom-so', title: 'Custom saved object' },
        owner: 'securitySolution',
      };
      const res = extractAttachmentSORefsFromAttributes(customSoBackedAttributes as never, []);

      expect(res.references).toEqual([
        {
          id: 'custom-so-id',
          name: 'attachmentId',
          type: 'custom-so',
        },
      ]);
    });
  });
});
