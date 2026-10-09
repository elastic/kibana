/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { caseFieldDefinitionSavedObjectType } from '.';

describe('caseFieldDefinitionSavedObjectType', () => {
  it('has the correct configuration', () => {
    expect(caseFieldDefinitionSavedObjectType.name).toBe('cases-field-definition');
    expect(caseFieldDefinitionSavedObjectType.hidden).toBe(true);
    expect(caseFieldDefinitionSavedObjectType.namespaceType).toBe('multiple-isolated');
  });

  describe('management', () => {
    it('is importable and exportable so field definitions ride along with case exports', () => {
      expect(caseFieldDefinitionSavedObjectType.management?.importableAndExportable).toBe(true);
    });

    it('is not visible in the generic SO management UI', () => {
      expect(caseFieldDefinitionSavedObjectType.management?.visibleInManagement).toBe(false);
    });

    it('returns the field definition name as the title', () => {
      const so = { attributes: { name: 'incident_type' } } as never;
      expect(caseFieldDefinitionSavedObjectType.management?.getTitle?.(so)).toBe('incident_type');
    });
  });
});
