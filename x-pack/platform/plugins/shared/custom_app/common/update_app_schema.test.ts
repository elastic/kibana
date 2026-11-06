/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { AUTHORING_GUIDE_EXAMPLE } from './authoring_guide';
import { customAppUpdateSchema } from './update_app_schema';

describe('customAppUpdateSchema', () => {
  it('accepts a panel id and a whole app', () => {
    expect(
      customAppUpdateSchema.safeParse({
        embeddable_id: 'panel-1',
        document: AUTHORING_GUIDE_EXAMPLE,
      }).success
    ).toBe(true);
  });

  it('takes the id of an app made in the conversation instead of a panel id', () => {
    expect(
      customAppUpdateSchema.safeParse({
        attachment_id: 'att-1',
        document: AUTHORING_GUIDE_EXAMPLE,
      }).success
    ).toBe(true);
  });

  it('needs an app, and refuses an empty id', () => {
    expect(
      customAppUpdateSchema.safeParse({ embeddable_id: '', document: AUTHORING_GUIDE_EXAMPLE })
        .success
    ).toBe(false);
    expect(customAppUpdateSchema.safeParse({ embeddable_id: 'panel-1' }).success).toBe(false);
  });

  it('checks the shape of the app: a component of an unknown type is refused', () => {
    expect(
      customAppUpdateSchema.safeParse({
        embeddable_id: 'p',
        document: { root: { type: 'carousel', id: 'x' } },
      }).success
    ).toBe(false);
  });

  it('leaves what looks across the app to the tool, which can say what is wrong in words', () => {
    // An input bound to a value that is not declared is well shaped but not valid.
    const result = customAppUpdateSchema.safeParse({
      embeddable_id: 'p',
      document: { root: { type: 'search', id: 'find', label: 'Find', bind: 'missing' } },
    });

    expect(result.success).toBe(true);
  });

  it('fills in what an app leaves out, so an agent need not write empty values', () => {
    const result = customAppUpdateSchema.parse({
      embeddable_id: 'p',
      document: { root: { type: 'table', id: 't', query: 'ROW 1' } },
    });

    expect(result.document.state).toEqual({});
    expect(result.document.root).toMatchObject({ onRowClick: [] });
  });

  describe('as the model sees it', () => {
    const jsonSchema = z.toJSONSchema(customAppUpdateSchema, { io: 'input' });
    const text = JSON.stringify(jsonSchema);

    it('can be described to a model as JSON Schema at all', () => {
      expect(jsonSchema).toMatchObject({ type: 'object' });
      expect(Object.keys((jsonSchema as unknown as { properties: object }).properties)).toEqual([
        'embeddable_id',
        'attachment_id',
        'document',
      ]);
    });

    it.each([
      'stack',
      'heading',
      'text',
      'callout',
      'stat',
      'table',
      'key_value',
      'select',
      'button_group',
      'search',
      'flyout',
    ])('offers the %s component', (type) => {
      expect(text).toContain(`"const":"${type}"`);
    });

    it('says what the two fields are for', () => {
      expect(text).toContain('embeddable_id of the custom app');
      expect(text).toContain('complete app');
    });

    it('makes what has a default optional, so the model writes less', () => {
      const required = JSON.stringify(
        (jsonSchema as unknown as { properties: { document: { required?: string[] } } }).properties
          .document.required ?? []
      );

      expect(required).toContain('root');
      expect(required).not.toContain('state');
    });
  });
});
