/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { caseTemplateSavedObjectType } from '.';

describe('caseTemplateSavedObjectType', () => {
  it('has the correct configuration', () => {
    expect(caseTemplateSavedObjectType.name).toBe('cases-templates');
    expect(caseTemplateSavedObjectType.hidden).toBe(true);
    expect(caseTemplateSavedObjectType.namespaceType).toBe('multiple-isolated');
    expect(caseTemplateSavedObjectType.convertToMultiNamespaceTypeVersion).toBe('8.0.0');
  });

  it('has the correct mappings', () => {
    expect(caseTemplateSavedObjectType.mappings).toMatchInlineSnapshot(`
      Object {
        "dynamic": false,
        "properties": Object {
          "author": Object {
            "type": "keyword",
          },
          "definition": Object {
            "type": "text",
          },
          "deletedAt": Object {
            "type": "date",
          },
          "description": Object {
            "type": "text",
          },
          "fieldCount": Object {
            "type": "integer",
          },
          "fieldNames": Object {
            "type": "keyword",
          },
          "isDefault": Object {
            "type": "boolean",
          },
          "isLatest": Object {
            "type": "boolean",
          },
          "lastUsedAt": Object {
            "type": "date",
          },
          "name": Object {
            "type": "keyword",
          },
          "owner": Object {
            "type": "keyword",
          },
          "tags": Object {
            "type": "keyword",
          },
          "templateId": Object {
            "type": "keyword",
          },
          "templateVersion": Object {
            "type": "integer",
          },
          "usageCount": Object {
            "type": "integer",
          },
        },
      }
    `);
  });
});
