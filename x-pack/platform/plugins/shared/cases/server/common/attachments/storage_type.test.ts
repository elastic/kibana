/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalReferenceStorageType } from '../../../common/types/domain';
import { getExternalReferenceStorage, isSavedObjectBackedExternalReference } from './storage_type';

describe('external reference storage type mapping', () => {
  describe('getExternalReferenceStorage', () => {
    it('returns elasticSearchDoc for the endpoint type id', () => {
      expect(getExternalReferenceStorage('endpoint')).toEqual({
        type: ExternalReferenceStorageType.elasticSearchDoc,
      });
    });

    it('defaults to elasticSearchDoc for unknown type ids', () => {
      expect(getExternalReferenceStorage('some-future-subtype')).toEqual({
        type: ExternalReferenceStorageType.elasticSearchDoc,
      });
    });
  });

  describe('isSavedObjectBackedExternalReference', () => {
    it('returns false for the endpoint type id (ES-doc backed)', () => {
      expect(isSavedObjectBackedExternalReference('endpoint')).toBe(false);
    });

    it('returns false for unknown / unmapped type ids', () => {
      expect(isSavedObjectBackedExternalReference('some-future-subtype')).toBe(false);
    });
  });
});
