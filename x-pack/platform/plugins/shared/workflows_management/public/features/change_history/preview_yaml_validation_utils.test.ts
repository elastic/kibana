/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreviewSchemasFingerprint } from './preview_yaml_validation_utils';

describe('preview_yaml_validation_utils', () => {
  describe('getPreviewSchemasFingerprint', () => {
    it('fingerprints schema registration by uri only', () => {
      const schemas = [
        {
          fileMatch: ['*'],
          uri: 'file:///workflow-schema.json',
          schema: { type: 'object' as const },
        },
      ];
      const sameUriDifferentBody = [
        {
          fileMatch: ['*'],
          uri: 'file:///workflow-schema.json',
          schema: { type: 'string' as const },
        },
      ];

      expect(getPreviewSchemasFingerprint(schemas)).toBe('file:///workflow-schema.json');
      expect(getPreviewSchemasFingerprint(sameUriDifferentBody)).toBe(
        'file:///workflow-schema.json'
      );
      expect(getPreviewSchemasFingerprint(schemas)).toBe(
        getPreviewSchemasFingerprint(sameUriDifferentBody)
      );
    });
  });
});
