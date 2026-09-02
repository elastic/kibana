/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldDefinitionJsonSchema } from './field_definition_json_schema';
import { FieldType } from '../../../../common/types/domain/template/fields';

type JsonSchemaObject = Record<string, unknown>;

function getBranches(
  schema: JsonSchemaObject
): Array<{ branch: JsonSchemaObject; title?: string; controlConst?: string }> {
  const unionBranches =
    (schema.oneOf as JsonSchemaObject[] | undefined) ??
    (schema.anyOf as JsonSchemaObject[] | undefined);

  const branches: JsonSchemaObject[] = [];
  if (Array.isArray(unionBranches)) {
    branches.push(...unionBranches);
  } else if (Array.isArray(schema.allOf)) {
    for (const entry of schema.allOf as JsonSchemaObject[]) {
      if (entry.then) {
        branches.push(entry.then as JsonSchemaObject);
      }
    }
  }

  if (branches.length === 0) {
    throw new Error('No branches found in field definition schema');
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

describe('getFieldDefinitionJsonSchema', () => {
  it('returns a valid JSON Schema', () => {
    const schema = getFieldDefinitionJsonSchema();
    expect(schema).not.toBeNull();
  });

  it('supports every inline field control the template editor supports, including MARKDOWN', () => {
    const schema = getFieldDefinitionJsonSchema() as JsonSchemaObject;
    const controls = getBranches(schema).map(({ controlConst }) => controlConst);

    const { MARKDOWN, ...rest } = FieldType;
    expect(controls).toContain(MARKDOWN);
    for (const control of Object.values(rest)) {
      expect(controls).toContain(control);
    }
  });

  it('does not offer a $ref branch (the library stores concrete fields, not references)', () => {
    const schema = getFieldDefinitionJsonSchema() as JsonSchemaObject;

    for (const { branch } of getBranches(schema)) {
      const props = (branch.properties ?? {}) as JsonSchemaObject;
      expect(props.$ref).toBeUndefined();
    }
    expect((schema.properties as JsonSchemaObject | undefined)?.$ref).toBeUndefined();
  });

  it('adds a control enum hint for autocomplete', () => {
    const schema = getFieldDefinitionJsonSchema() as JsonSchemaObject;

    const controlProp = (schema.properties as JsonSchemaObject)?.control as JsonSchemaObject;
    expect(controlProp).toBeDefined();
    expect(controlProp.enum).toEqual(expect.arrayContaining(Object.values(FieldType)));
  });

  it('adds a human-readable title to every branch', () => {
    const schema = getFieldDefinitionJsonSchema() as JsonSchemaObject;

    for (const { title, controlConst } of getBranches(schema)) {
      expect(controlConst).toBeDefined();
      expect(typeof title).toBe('string');
      expect(title!.length).toBeGreaterThan(0);
    }
  });

  it('adds numeric type enum hints on the INPUT_NUMBER branch only', () => {
    const schema = getFieldDefinitionJsonSchema() as JsonSchemaObject;
    const branches = getBranches(schema);

    const inputNumberBranch = branches.find(({ controlConst }) => controlConst === 'INPUT_NUMBER');
    expect(inputNumberBranch).toBeDefined();

    const branchProps = inputNumberBranch!.branch.properties as JsonSchemaObject | undefined;
    let typeProp = branchProps?.type as JsonSchemaObject | undefined;

    if (!typeProp && Array.isArray(inputNumberBranch!.branch.allOf)) {
      for (const entry of inputNumberBranch!.branch.allOf as JsonSchemaObject[]) {
        typeProp = (entry.properties as JsonSchemaObject | undefined)?.type as JsonSchemaObject;
        if (typeProp) {
          break;
        }
      }
    }

    expect(typeProp?.enum).toEqual(
      expect.arrayContaining(['integer', 'long', 'double', 'float', 'byte'])
    );
    expect(typeProp?.enum).not.toContain('date');
    expect(typeProp?.enum).not.toContain('keyword');

    // The merged type enum must not leak to the shared top-level properties.
    const sharedTypeProp = (schema.properties as JsonSchemaObject | undefined)?.type;
    expect(sharedTypeProp).toBeUndefined();
  });

  it('disallows unknown metadata keys so typos surface in the editor', () => {
    const schema = getFieldDefinitionJsonSchema() as JsonSchemaObject;
    const branches = getBranches(schema);

    const withMetadata = branches
      .map(({ branch }) => {
        const direct = (branch.properties as JsonSchemaObject | undefined)?.metadata;
        if (direct) return direct as JsonSchemaObject;
        for (const entry of (branch.allOf as JsonSchemaObject[] | undefined) ?? []) {
          const nested = (entry.properties as JsonSchemaObject | undefined)?.metadata;
          if (nested) return nested as JsonSchemaObject;
        }
        return undefined;
      })
      .filter((metadata): metadata is JsonSchemaObject => metadata != null);

    expect(withMetadata.length).toBeGreaterThan(0);
    for (const metadata of withMetadata) {
      if (metadata.type === 'object' && metadata.properties != null) {
        expect(metadata.additionalProperties).toBe(false);
      }
    }
  });

  it('uses if/then structure keyed on control for better error messages', () => {
    const schema = getFieldDefinitionJsonSchema() as JsonSchemaObject;

    expect(schema.allOf).toBeDefined();
    expect(schema.oneOf).toBeUndefined();
    expect(schema.anyOf).toBeUndefined();

    const ifThenEntries = (schema.allOf as JsonSchemaObject[]).filter(
      (entry) => entry.if && entry.then
    );
    expect(ifThenEntries.length).toBeGreaterThan(0);
  });

  it('attaches a scaffold snippet per inline control at the document root', () => {
    const schema = getFieldDefinitionJsonSchema() as JsonSchemaObject;
    const snippets = schema.defaultSnippets as Array<{ label: string; body: JsonSchemaObject }>;

    expect(Array.isArray(snippets)).toBe(true);

    const controls = snippets.map(({ body }) => body.control);
    for (const control of Object.values(FieldType)) {
      expect(controls).toContain(control);
    }
    // No $ref snippet in the library editor.
    expect(snippets.some(({ body }) => '$ref' in body)).toBe(false);
  });
});
