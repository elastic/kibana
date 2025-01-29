/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  externalReferenceAttachmentESAttributes,
  externalReferenceAttachmentSOAttributes,
  externalReferenceAttachmentSOAttributesWithoutRefs,
  createPersistableStateAttachmentTypeRegistryMock,
  persistableStateAttachmentAttributes,
  persistableStateAttachmentAttributesWithoutInjectedId,
} from '../attachment_framework/mocks';
import {
  extractAttachmentSORefsFromAttributes,
  getUniqueReferences,
  injectAttachmentSOAttributesFromRefs,
  injectAttachmentSOAttributesFromRefsForPatch,
} from './so_references';

describe('so_references', () => {
  const persistableStateAttachmentTypeRegistry = createPersistableStateAttachmentTypeRegistryMock();
  const references = [
    {
      id: 'testRef',
      name: 'myTestReference',
      type: 'test-so',
    },
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
    it('should inject the references to the attributes correctly (persistable state)', () => {
      const savedObject = {
        id: 'so-id',
        attributes: persistableStateAttachmentAttributesWithoutInjectedId,
        references,
        version: 'so-version',
        type: 'cases-comments',
      };

      const res = injectAttachmentSOAttributesFromRefs(
        savedObject,
        persistableStateAttachmentTypeRegistry
      );

      expect(res).toEqual({
        ...savedObject,
        attributes: persistableStateAttachmentAttributes,
      });
    });

    it('should inject the references to the attributes correctly (external reference savedObject)', () => {
      const savedObject = {
        id: 'so-id',
        attributes: externalReferenceAttachmentSOAttributesWithoutRefs,
        references,
        version: 'so-version',
        type: 'cases-comments',
      };

      const res = injectAttachmentSOAttributesFromRefs(
        savedObject,
        persistableStateAttachmentTypeRegistry
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

      const res = injectAttachmentSOAttributesFromRefs(
        savedObject,
        persistableStateAttachmentTypeRegistry
      );

      expect(res).toEqual({
        ...savedObject,
        attributes: externalReferenceAttachmentESAttributes,
      });
    });
  });

  describe('injectAttachmentSOAttributesFromRefsForPatch', () => {
    it('should inject the references to the attributes correctly (persistable state)', () => {
      const savedObject = {
        id: 'so-id',
        attributes: persistableStateAttachmentAttributesWithoutInjectedId,
        references,
        version: 'so-version',
        type: 'cases-comments',
      };

      const res = injectAttachmentSOAttributesFromRefsForPatch(
        persistableStateAttachmentAttributes,
        savedObject,
        persistableStateAttachmentTypeRegistry
      );

      expect(res).toEqual({
        ...savedObject,
        attributes: persistableStateAttachmentAttributes,
      });
    });

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
        savedObject,
        persistableStateAttachmentTypeRegistry
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
        savedObject,
        persistableStateAttachmentTypeRegistry
      );

      expect(res).toEqual({
        ...savedObject,
        attributes: externalReferenceAttachmentESAttributes,
      });
    });
  });

  describe('extractAttachmentSORefsFromAttributes', () => {
    it('should extract the references from the attributes correctly (persistable state)', () => {
      const res = extractAttachmentSORefsFromAttributes(
        persistableStateAttachmentAttributes,
        [],
        persistableStateAttachmentTypeRegistry
      );

      expect(res).toEqual({
        attributes: {
          ...persistableStateAttachmentAttributesWithoutInjectedId,
        },
        references: [
          {
            id: 'testRef',
            name: 'myTestReference',
            type: 'test-so',
          },
        ],
        didDeleteOperation: false,
      });
    });

    it('should extract the references from the attributes correctly (external reference savedObject)', () => {
      const res = extractAttachmentSORefsFromAttributes(
        externalReferenceAttachmentSOAttributes,
        [],
        persistableStateAttachmentTypeRegistry
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
        [],
        persistableStateAttachmentTypeRegistry
      );

      expect(res).toEqual({
        attributes: externalReferenceAttachmentESAttributes,
        references: [],
        didDeleteOperation: false,
      });
    });
  });
});
