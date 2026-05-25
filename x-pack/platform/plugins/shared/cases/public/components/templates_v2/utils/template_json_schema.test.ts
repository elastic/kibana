/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTemplateDefinitionJsonSchema } from './template_json_schema';

type JsonSchemaObject = Record<string, unknown>;

function getFieldsOneOfBranches(
  schema: JsonSchemaObject
): Array<{ branch: JsonSchemaObject; title?: string; controlConst?: string }> {
  const fieldsSchema = (schema.properties as JsonSchemaObject)?.fields as JsonSchemaObject;
  if (!fieldsSchema) {
    throw new Error('fields property not found in schema');
  }

  const itemsSchema = fieldsSchema.items as JsonSchemaObject;
  if (!itemsSchema) {
    throw new Error('items not found in fields schema');
  }

  const unionBranches =
    (itemsSchema.oneOf as JsonSchemaObject[] | undefined) ??
    (itemsSchema.anyOf as JsonSchemaObject[] | undefined);

  const branches: JsonSchemaObject[] = [];
  if (Array.isArray(unionBranches)) {
    branches.push(...unionBranches);
  } else if (Array.isArray(itemsSchema.allOf)) {
    for (const entry of itemsSchema.allOf as JsonSchemaObject[]) {
      if (entry.then) {
        branches.push(entry.then as JsonSchemaObject);
      }
    }
  }

  if (branches.length === 0) {
    throw new Error('No branches found in fields.items schema');
  }

  return branches.map((branch) => {
    let controlConst: string | undefined;

    if (branch.properties) {
      const control = (branch.properties as JsonSchemaObject).control as JsonSchemaObject;
      if (control?.const) {
        controlConst = control.const as string;
      }
    }

    if (branch.allOf && Array.isArray(branch.allOf)) {
      for (const entry of branch.allOf as JsonSchemaObject[]) {
        const control = (entry.properties as JsonSchemaObject | undefined)
          ?.control as JsonSchemaObject;
        if (control?.const) {
          controlConst = control.const as string;
        }
      }
    }

    return {
      branch,
      title: branch.title as string | undefined,
      controlConst,
    };
  });
}

describe('getTemplateDefinitionJsonSchema', () => {
  it('returns a valid JSON Schema', () => {
    const schema = getTemplateDefinitionJsonSchema();
    expect(schema).not.toBeNull();
  });

  it('adds a title to every oneOf branch that has a control discriminator', () => {
    const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
    const branches = getFieldsOneOfBranches(schema);

    expect(branches.length).toBeGreaterThan(0);

    const controlBranches = branches.filter(({ controlConst }) => controlConst != null);
    expect(controlBranches.length).toBeGreaterThan(0);

    for (const { title, controlConst } of controlBranches) {
      expect(title).toBeDefined();
      expect(typeof title).toBe('string');
      expect(title!.length).toBeGreaterThan(0);
      expect(controlConst).toBeDefined();
    }
  });

  it('maps each field type to the expected title', () => {
    const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
    const branches = getFieldsOneOfBranches(schema);

    const titlesByControl = Object.fromEntries(
      branches.map(({ controlConst, title }) => [controlConst, title])
    );

    expect(titlesByControl).toMatchObject({
      INPUT_TEXT: 'Text Input',
      INPUT_NUMBER: 'Number Input',
      SELECT_BASIC: 'Select',
      TEXTAREA: 'Textarea',
      DATE_PICKER: 'Date Picker',
      CHECKBOX_GROUP: 'Checkbox Group',
      RADIO_GROUP: 'Radio Group',
      USER_PICKER: 'User Picker',
    });
  });

  it('adds a control enum hint via addDiscriminatorEnumHints', () => {
    const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
    const fieldsSchema = (schema.properties as JsonSchemaObject)?.fields as JsonSchemaObject;
    const itemsSchema = fieldsSchema.items as JsonSchemaObject;

    const controlProp = (itemsSchema.properties as JsonSchemaObject)?.control as JsonSchemaObject;
    expect(controlProp).toBeDefined();
    expect(controlProp.enum).toBeDefined();
    expect(Array.isArray(controlProp.enum)).toBe(true);
    expect(controlProp.enum).toContain('INPUT_TEXT');
    expect(controlProp.enum).toContain('SELECT_BASIC');
  });

  it('adds a type enum hint that includes numeric field types', () => {
    const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
    const fieldsSchema = (schema.properties as JsonSchemaObject)?.fields as JsonSchemaObject;
    const itemsSchema = fieldsSchema.items as JsonSchemaObject;

    const typeProp = (itemsSchema.properties as JsonSchemaObject)?.type as JsonSchemaObject;
    expect(typeProp).toBeDefined();
    expect(typeProp.enum).toBeDefined();
    expect(Array.isArray(typeProp.enum)).toBe(true);
    expect(typeProp.enum).toContain('keyword');
    expect(typeProp.enum).toContain('date');
    expect(typeProp.enum).toContain('integer');
    expect(typeProp.enum).toContain('long');
    expect(typeProp.enum).toContain('double');
  });

  it('uses if/then structure keyed on control for better error messages', () => {
    const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
    const fieldsSchema = (schema.properties as JsonSchemaObject)?.fields as JsonSchemaObject;
    const itemsSchema = fieldsSchema.items as JsonSchemaObject;

    expect(itemsSchema.allOf).toBeDefined();
    expect(Array.isArray(itemsSchema.allOf)).toBe(true);
    expect(itemsSchema.oneOf).toBeUndefined();
    expect(itemsSchema.anyOf).toBeUndefined();

    const allOf = itemsSchema.allOf as JsonSchemaObject[];
    const ifThenEntries = allOf.filter((entry) => entry.if && entry.then);
    expect(ifThenEntries.length).toBeGreaterThan(0);

    const inputNumberEntry = ifThenEntries.find((entry) => {
      const ifSchema = entry.if as JsonSchemaObject;
      const props = (ifSchema.properties as JsonSchemaObject)?.control as JsonSchemaObject;
      return props?.const === 'INPUT_NUMBER';
    });
    expect(inputNumberEntry).toBeDefined();
  });
});
