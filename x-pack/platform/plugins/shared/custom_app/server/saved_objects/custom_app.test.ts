/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_APP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { customAppSavedObjectType } from './custom_app';
import type { customAppAttributesSchemaV1 } from './schemas';

const attributes = {
  title: 'Service explorer',
  description: 'Filters and a table of services',
  version: 1,
  document: { state: {}, root: { type: 'heading', id: 'title', text: 'Hi' } },
};

describe('the custom app saved object type', () => {
  it('is named as the plugin refers to it, and is shared between spaces the way dashboards are', () => {
    expect(customAppSavedObjectType.name).toBe(CUSTOM_APP_SAVED_OBJECT_TYPE);
    expect(customAppSavedObjectType.name).toBe('custom_app');
    expect(customAppSavedObjectType.namespaceType).toBe('multiple-isolated');
  });

  it('is visible, so that it can be exported with a dashboard that uses it', () => {
    expect(customAppSavedObjectType.hidden).toBe(false);
    expect(customAppSavedObjectType.management?.importableAndExportable).toBe(true);
  });

  it('indexes only what is searched, and stores the document without indexing it', () => {
    expect(customAppSavedObjectType.mappings).toEqual({
      dynamic: false,
      properties: {
        title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        description: { type: 'text' },
      },
    });
  });

  it('never uses mapping options that cannot be undone', () => {
    const text = JSON.stringify(customAppSavedObjectType.mappings);
    expect(text).not.toContain('"enabled"');
    expect(text).not.toContain('"index":false');
  });

  it('titles itself with the title of the app', () => {
    const title = customAppSavedObjectType.management?.getTitle?.({
      id: '1',
      type: 'custom_app',
      attributes,
      references: [],
    });

    expect(title).toBe('Service explorer');
  });

  describe('model version 1', () => {
    const version = customAppSavedObjectType.modelVersions as Record<
      string,
      { changes: unknown[]; schemas: { create: typeof customAppAttributesSchemaV1 } }
    >;

    it('is the only version, and needs no change to the index mappings', () => {
      expect(Object.keys(version)).toEqual(['1']);
      expect(version['1'].changes).toEqual([]);
    });

    it('accepts what the routes store, with or without a description', () => {
      expect(() => version['1'].schemas.create.validate(attributes)).not.toThrow();
      const { description, ...withoutDescription } = attributes;
      expect(() => version['1'].schemas.create.validate(withoutDescription)).not.toThrow();
    });

    it('accepts an app that has a theme, which is stored with the document and not indexed', () => {
      const themed = {
        ...attributes,
        document: { ...attributes.document, theme: { accent: 'purple', shape: 'soft' } },
      };

      expect(version['1'].schemas.create.validate(themed)).toEqual(themed);
    });

    it.each([
      ['no title', { ...attributes, title: undefined }],
      ['a title that is too long', { ...attributes, title: 'x'.repeat(257) }],
      ['no document', { ...attributes, document: undefined }],
      ['a document without a root', { ...attributes, document: { state: {} } }],
    ])('refuses %s', (_name, bad) => {
      expect(() => version['1'].schemas.create.validate(bad)).toThrow();
    });

    it('lets a newer build add attributes without breaking this one', () => {
      const forward = (
        version['1'].schemas as unknown as {
          forwardCompatibility: typeof customAppAttributesSchemaV1;
        }
      ).forwardCompatibility;

      expect(forward.validate({ ...attributes, addedLater: 1 })).toEqual(attributes);
    });
  });
});
