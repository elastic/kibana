/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTemplateDefinitionJsonSchema } from './template_json_schema';
import { FieldType } from '../../../../common/types/domain/template/fields';

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
      TOGGLE: 'Toggle',
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

  it('does not add a merged type enum hint at the top level', () => {
    const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
    const fieldsSchema = (schema.properties as JsonSchemaObject)?.fields as JsonSchemaObject;
    const itemsSchema = fieldsSchema.items as JsonSchemaObject;

    const typeProp = (itemsSchema.properties as JsonSchemaObject | undefined)?.type;
    expect(typeProp).toBeUndefined();
  });

  it('adds numeric type enum hints on the INPUT_NUMBER branch only', () => {
    const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
    const branches = getFieldsOneOfBranches(schema);

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
  });

  it('keeps date as the only type on the DATE_PICKER branch', () => {
    const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
    const branches = getFieldsOneOfBranches(schema);

    const datePickerBranch = branches.find(({ controlConst }) => controlConst === 'DATE_PICKER');
    expect(datePickerBranch).toBeDefined();

    const branchProps = datePickerBranch!.branch.properties as JsonSchemaObject | undefined;
    let typeProp = branchProps?.type as JsonSchemaObject | undefined;

    if (!typeProp && Array.isArray(datePickerBranch!.branch.allOf)) {
      for (const entry of datePickerBranch!.branch.allOf as JsonSchemaObject[]) {
        typeProp = (entry.properties as JsonSchemaObject | undefined)?.type as JsonSchemaObject;
        if (typeProp) {
          break;
        }
      }
    }

    expect(typeProp?.const ?? typeProp?.enum).toEqual('date');
  });

  it('exposes required_on_close as a boolean property on the validation object of every inline field branch', () => {
    const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
    const branches = getFieldsOneOfBranches(schema);

    const inlineBranches = branches.filter(({ controlConst }) => controlConst != null);
    expect(inlineBranches.length).toBeGreaterThan(0);

    for (const { branch, controlConst } of inlineBranches) {
      // Validation may be nested directly in branch.properties or inside an allOf entry
      let validationProp: JsonSchemaObject | undefined;

      const directProps = branch.properties as JsonSchemaObject | undefined;
      if (directProps?.validation) {
        validationProp = directProps.validation as JsonSchemaObject;
      } else if (Array.isArray(branch.allOf)) {
        for (const entry of branch.allOf as JsonSchemaObject[]) {
          const p = (entry.properties as JsonSchemaObject | undefined)?.validation as
            | JsonSchemaObject
            | undefined;
          if (p) {
            validationProp = p;
            break;
          }
        }
      }

      if (!validationProp) {
        // Top-level shared properties might carry it
        const fieldsSchema = (schema.properties as JsonSchemaObject)?.fields as JsonSchemaObject;
        const itemsSchema = fieldsSchema.items as JsonSchemaObject;
        const sharedProps = itemsSchema.properties as JsonSchemaObject | undefined;
        validationProp = sharedProps?.validation as JsonSchemaObject | undefined;
      }

      expect(validationProp).toBeDefined();

      const validationProps = (validationProp!.properties ??
        (validationProp!.allOf as JsonSchemaObject[] | undefined)?.[0]?.properties) as
        | JsonSchemaObject
        | undefined;

      expect(validationProps?.required_on_close).toBeDefined();
      expect((validationProps?.required_on_close as JsonSchemaObject)?.type).toBe('boolean');

      // Sanity check: `required` is also present (unchanged)
      expect(validationProps?.required).toBeDefined();

      // suppress unused controlConst lint
      void controlConst;
    }
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

  describe('connector and settings', () => {
    it('omits connector and settings from the editor schema (panel-owned, not in the buffer)', () => {
      // They are edited on the Configuration tab and merged into the definition on save, so the
      // editor must not suggest them — otherwise a value typed in the Fields YAML would be silently
      // overwritten by the panel state on save.
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const props = schema.properties as JsonSchemaObject;

      expect(props.connector).toBeUndefined();
      expect(props.settings).toBeUndefined();
    });

    it('exposes the editable case-default and fields properties but no template_* identity keys', () => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const props = schema.properties as JsonSchemaObject;

      // Template identity is not part of the YAML anymore.
      expect(props.template_name).toBeUndefined();
      expect(props.template_description).toBeUndefined();
      expect(props.template_tags).toBeUndefined();

      expect(props.name).toBeDefined();
      expect(props.description).toBeDefined();
      expect(props.tags).toBeDefined();
      expect(props.severity).toBeDefined();
      expect(props.category).toBeDefined();
      expect(props.assignees).toBeDefined();
      expect(props.fields).toBeDefined();
    });

    it('marks only the structural fields block as required so Monaco flags its removal', () => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const required = (schema.required as string[]) ?? [];

      expect(required).toEqual(['fields']);
    });

    it('does not mark any case-default block as required (all optional)', () => {
      // Only the template identity name (a saved-object attribute) is required to create a template;
      // every case default in the YAML is optional and must not be flagged when absent.
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const required = (schema.required as string[]) ?? [];

      for (const key of ['name', 'description', 'severity', 'category', 'tags', 'assignees']) {
        expect(required).not.toContain(key);
      }
    });

    it('does not mark the renderer-managed connector/settings blocks as required', () => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const required = (schema.required as string[]) ?? [];

      expect(required).not.toContain('settings');
      expect(required).not.toContain('connector');
    });
  });

  describe('null is never offered as an autocomplete value', () => {
    // The runtime Zod schema keeps case defaults nullable for back-compat, but the editor schema
    // must not surface `null` (as a branch, a `null` type, or a `null` enum member) — otherwise
    // Monaco suggests it as a value.
    const containsNull = (node: unknown): boolean => {
      if (node === null || node === 'null') {
        return true;
      }
      if (Array.isArray(node)) {
        return node.some(containsNull);
      }
      if (node && typeof node === 'object') {
        return Object.values(node as Record<string, unknown>).some(containsNull);
      }
      return false;
    };

    it('strips null from the nullable case-default properties (severity/description/category)', () => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const props = schema.properties as JsonSchemaObject;

      for (const key of ['severity', 'description', 'category']) {
        expect(containsNull(props[key])).toBe(false);
      }
    });

    it('keeps the concrete severities suggestable after stripping null', () => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const props = schema.properties as JsonSchemaObject;
      const severityEnum = (props.severity as JsonSchemaObject).enum as unknown[] | undefined;

      expect(severityEnum).toEqual(expect.arrayContaining(['low', 'medium', 'high', 'critical']));
    });
  });

  describe('metadata key strictness', () => {
    const getBranchMetadata = (branch: JsonSchemaObject): JsonSchemaObject | undefined => {
      const directProps = branch.properties as JsonSchemaObject | undefined;
      if (directProps?.metadata) {
        return directProps.metadata as JsonSchemaObject;
      }
      if (Array.isArray(branch.allOf)) {
        for (const entry of branch.allOf as JsonSchemaObject[]) {
          const metadata = (entry.properties as JsonSchemaObject | undefined)?.metadata as
            | JsonSchemaObject
            | undefined;
          if (metadata) {
            return metadata;
          }
        }
      }
      return undefined;
    };

    it('marks metadata objects as additionalProperties:false so Monaco flags misspelled keys', () => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const branches = getFieldsOneOfBranches(schema);

      const metadataObjects = branches
        .map(({ branch }) => getBranchMetadata(branch))
        .filter((metadata): metadata is JsonSchemaObject => metadata?.type === 'object');

      expect(metadataObjects.length).toBeGreaterThan(0);
      for (const metadata of metadataObjects) {
        expect(metadata.additionalProperties).toBe(false);
      }
    });

    it('keeps each control real metadata keys allowed (so additionalProperties:false never false-flags them)', () => {
      // Because metadata is locked to additionalProperties:false, any real metadata key the renderer
      // supports must be present as a named property — otherwise Monaco would wrongly flag it as "not
      // allowed". This guards against a future control prop being dropped from the Zod named props.
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const branches = getFieldsOneOfBranches(schema);

      const metadataKeysFor = (control: string): string[] => {
        const branch = branches.find(({ controlConst }) => controlConst === control);
        const metadata = branch ? getBranchMetadata(branch.branch) : undefined;
        return Object.keys((metadata?.properties as JsonSchemaObject | undefined) ?? {});
      };

      // `default` is honored at runtime for a date picker, so it must be an allowed key.
      expect(metadataKeysFor('DATE_PICKER')).toEqual(
        expect.arrayContaining(['show_time', 'timezone', 'default'])
      );
      expect(metadataKeysFor('USER_PICKER')).toEqual(expect.arrayContaining(['multiple']));
      expect(metadataKeysFor('TEXTAREA')).toEqual(expect.arrayContaining(['markdown']));
      expect(metadataKeysFor('MARKDOWN')).toEqual(expect.arrayContaining(['content']));
      expect(metadataKeysFor('TOGGLE')).toEqual(expect.arrayContaining(['default']));
    });

    it('includes both options and default in the SELECT_BASIC metadata schema', () => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const branches = getFieldsOneOfBranches(schema);

      const selectBranch = branches.find(({ controlConst }) => controlConst === 'SELECT_BASIC');
      expect(selectBranch).toBeDefined();

      const metadata = getBranchMetadata(selectBranch!.branch);
      const metadataProps = metadata?.properties as JsonSchemaObject | undefined;

      expect(metadataProps?.options).toBeDefined();
      expect(metadataProps?.default).toBeDefined();
    });

    // Every control whose value flows through useYamlFormSync honors `metadata.default` at runtime.
    // Because metadata is locked to additionalProperties:false, each such control MUST declare
    // `default` as a named property — otherwise the editor false-flags a working default (the
    // DATE_PICKER regression). Parametrized so a newly-added control can't silently reintroduce it.
    const valueBearingControls = Object.values(FieldType).filter(
      (control) => control !== FieldType.MARKDOWN
    );

    it.each(valueBearingControls)('allows default in the %s metadata schema', (control) => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const branch = getFieldsOneOfBranches(schema).find(
        ({ controlConst }) => controlConst === control
      );
      expect(branch).toBeDefined();

      const metadata = getBranchMetadata(branch!.branch);
      expect((metadata?.properties as JsonSchemaObject | undefined)?.default).toBeDefined();
    });

    it('omits default for the display-only MARKDOWN control (it holds no value)', () => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const branch = getFieldsOneOfBranches(schema).find(
        ({ controlConst }) => controlConst === FieldType.MARKDOWN
      );
      expect(branch).toBeDefined();

      const metadata = getBranchMetadata(branch!.branch);
      expect((metadata?.properties as JsonSchemaObject | undefined)?.default).toBeUndefined();
    });
  });

  describe('defaultSnippets (field-type scaffolding autocomplete)', () => {
    interface Snippet {
      label: string;
      description?: string;
      body: JsonSchemaObject;
    }

    const getFieldSnippets = (): Snippet[] => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const fieldsSchema = (schema.properties as JsonSchemaObject)?.fields as JsonSchemaObject;
      const itemsSchema = fieldsSchema.items as JsonSchemaObject;
      return itemsSchema.defaultSnippets as Snippet[];
    };

    it('attaches a defaultSnippet for every field control plus a $ref reference', () => {
      const snippets = getFieldSnippets();
      expect(Array.isArray(snippets)).toBe(true);

      const controls = snippets
        .map(({ body }) => body.control)
        .filter((control): control is string => typeof control === 'string');

      // Every control the field catalog supports is offered as a ready-to-edit snippet.
      for (const control of Object.values(FieldType)) {
        expect(controls).toContain(control);
      }

      // …and a `$ref` snippet exists for library references (no `control`).
      const refSnippet = snippets.find(({ body }) => '$ref' in body);
      expect(refSnippet).toBeDefined();
      expect(refSnippet!.body.$ref).toEqual(expect.any(String));
    });

    it('gives every snippet a human-readable label and body', () => {
      const snippets = getFieldSnippets();
      for (const { label, body } of snippets) {
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
        expect(body).toBeInstanceOf(Object);
      }
    });

    it('scaffolds the required metadata for controls that need it', () => {
      const snippets = getFieldSnippets();
      const byControl = (control: string) => snippets.find(({ body }) => body.control === control);

      const select = byControl(FieldType.SELECT_BASIC);
      expect((select!.body.metadata as JsonSchemaObject).options).toBeDefined();

      const markdown = byControl(FieldType.MARKDOWN);
      expect((markdown!.body.metadata as JsonSchemaObject).content).toBeDefined();
    });

    it('exposes $ref as a completable key on a field entry', () => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const fieldsSchema = (schema.properties as JsonSchemaObject)?.fields as JsonSchemaObject;
      const itemsSchema = fieldsSchema.items as JsonSchemaObject;
      const props = itemsSchema.properties as JsonSchemaObject;

      expect(props.$ref).toBeDefined();
      expect((props.$ref as JsonSchemaObject).type).toBe('string');
    });

    it('offers an assignee (uid) snippet', () => {
      const schema = getTemplateDefinitionJsonSchema() as JsonSchemaObject;
      const assignees = (schema.properties as JsonSchemaObject)?.assignees as JsonSchemaObject;
      const itemsSchema = assignees.items as JsonSchemaObject;
      const snippets = itemsSchema.defaultSnippets as Snippet[];

      expect(Array.isArray(snippets)).toBe(true);
      expect(snippets[0].body.uid).toEqual(expect.any(String));
    });
  });
});
