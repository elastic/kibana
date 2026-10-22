/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const FIELD_TYPE_PROCESSOR_TAG_PREFIX = 'automatic_import_field_type:';

const LEGACY_FIELD_TYPE_PROCESSOR_DESCRIPTION = 'Generated from the field type in the Table tab.';

const GENERATED_DESCRIPTION_PATTERN =
  /^Converts .+ to match its \S+ field type\. Managed by Automatic Import\.$/;

const getFieldTypeProcessorDescription = (fieldName: string, type: string): string =>
  `Converts ${fieldName} to match its ${type} field type. Managed by Automatic Import.`;

type ConvertType = 'integer' | 'long' | 'float' | 'double' | 'boolean' | 'ip' | 'string';

type FieldTypeProcessorIssue =
  | 'duplicate_generated_processor'
  | 'invalid_convert_type'
  | 'unsupported_generated_processor';

interface FieldTypeProcessorError {
  name: string;
  issue: FieldTypeProcessorIssue;
}

/** A field type edit, as stored on the data stream. */
export interface FieldTypeEdit {
  name: string;
  type: string;
  original_type: string;
}

type Processor = Record<string, unknown>;

export interface PipelineDefinition {
  processors?: unknown[];
}

const STRING_TYPES: ReadonlySet<string> = new Set([
  'keyword',
  'constant_keyword',
  'wildcard',
  'text',
  'match_only_text',
  'version',
]);

const NON_STRING_TYPES: ReadonlySet<string> = new Set([
  'byte',
  'short',
  'integer',
  'long',
  'unsigned_long',
  'half_float',
  'float',
  'double',
  'boolean',
]);

const CONVERT_FROM_STRING: Readonly<Record<string, ConvertType>> = {
  byte: 'integer',
  short: 'integer',
  integer: 'integer',
  long: 'long',
  half_float: 'float',
  float: 'float',
  double: 'double',
  boolean: 'boolean',
  ip: 'ip',
};

const CONVERT_TYPE_TO_FIELD_TYPE: Readonly<Record<ConvertType, string>> = {
  integer: 'integer',
  long: 'long',
  float: 'float',
  double: 'double',
  boolean: 'boolean',
  ip: 'ip',
  string: 'keyword',
};

// Keys the rebuild always sets (or removes) on a generated processor. Anything else is kept.
const MANAGED_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'tag',
  'field',
  'type',
  'ignore_missing',
  'processor',
  'target_field',
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isConvertType = (value: unknown): value is ConvertType =>
  typeof value === 'string' &&
  Object.prototype.hasOwnProperty.call(CONVERT_TYPE_TO_FIELD_TYPE, value);

/**
 * Returns the convert processor type needed to change a field from its original (inferred) type
 * to the edited type, or undefined when the mapping alone is enough.
 */
export const getConvertType = (originalType: string, type: string): ConvertType | undefined => {
  if (STRING_TYPES.has(originalType)) {
    return CONVERT_FROM_STRING[type];
  }
  if (NON_STRING_TYPES.has(originalType) && STRING_TYPES.has(type)) {
    return 'string';
  }
  return undefined;
};

export const getFieldTypeProcessorTag = (fieldName: string): string =>
  `${FIELD_TYPE_PROCESSOR_TAG_PREFIX}${fieldName}`;

const getProcessorConfig = (processor: unknown): Record<string, unknown> | undefined => {
  if (!isPlainObject(processor)) return undefined;
  const [processorType] = Object.keys(processor);
  const config = processorType ? processor[processorType] : undefined;
  return isPlainObject(config) ? config : undefined;
};

/** Returns the field a generated processor belongs to, or undefined for any other processor. */
export const getGeneratedProcessorField = (processor: unknown): string | undefined => {
  const tag = getProcessorConfig(processor)?.tag;
  if (typeof tag !== 'string' || !tag.startsWith(FIELD_TYPE_PROCESSOR_TAG_PREFIX)) {
    return undefined;
  }
  const fieldName = tag.slice(FIELD_TYPE_PROCESSOR_TAG_PREFIX.length);
  return fieldName.length > 0 ? fieldName : undefined;
};

const getProcessors = (pipeline: PipelineDefinition): unknown[] =>
  Array.isArray(pipeline.processors) ? pipeline.processors : [];

/** Removes every generated field type processor from the pipeline. */
export const stripFieldTypeProcessors = <T extends PipelineDefinition>(pipeline: T): T => ({
  ...pipeline,
  processors: getProcessors(pipeline).filter(
    (processor) => getGeneratedProcessorField(processor) === undefined
  ),
});

const groupGeneratedProcessors = (pipeline: PipelineDefinition): Map<string, Processor[]> => {
  const groups = new Map<string, Processor[]>();
  for (const processor of getProcessors(pipeline)) {
    const fieldName = getGeneratedProcessorField(processor);
    if (fieldName !== undefined && isPlainObject(processor)) {
      groups.set(fieldName, [...(groups.get(fieldName) ?? []), processor]);
    }
  }
  return groups;
};

/** Finds the convert config of a generated processor, looking inside `foreach` wrappers. */
const findConvertConfig = (processor: unknown): Record<string, unknown> | undefined => {
  if (!isPlainObject(processor)) return undefined;
  if (isPlainObject(processor.convert)) return processor.convert;
  if (isPlainObject(processor.foreach)) return findConvertConfig(processor.foreach.processor);
  return undefined;
};

/**
 * Returns the indexes of path segments that hold arrays of objects in any sample, so the convert
 * can be wrapped in `foreach` processors. Arrays of plain values at the leaf need no wrapping.
 */
const getArrayOfObjectsSegments = (
  documents: ReadonlyArray<Record<string, unknown>>,
  segments: readonly string[]
): number[] => {
  const arraySegments = new Set<number>();

  const visit = (value: unknown, index: number): void => {
    if (index >= segments.length - 1 || !isPlainObject(value)) return;
    const child = value[segments[index]];
    if (Array.isArray(child)) {
      const objects = child.filter(isPlainObject);
      if (objects.length === 0) return;
      arraySegments.add(index);
      objects.forEach((element) => visit(element, index + 1));
      return;
    }
    visit(child, index + 1);
  };

  documents.forEach((document) => visit(document, 0));
  return [...arraySegments].sort((a, b) => a - b);
};

const buildConvertNode = ({
  basePath,
  segments,
  start,
  arraySegments,
  convertType,
  tag,
}: {
  basePath: string | undefined;
  segments: readonly string[];
  start: number;
  arraySegments: readonly number[];
  convertType: ConvertType;
  tag: string;
}): Processor => {
  const joinPath = (parts: readonly string[]) =>
    [...(basePath ? [basePath] : []), ...parts].join('.');
  const arrayEnd = arraySegments.find((segment) => segment >= start);

  if (arrayEnd === undefined) {
    return {
      convert: {
        tag,
        field: joinPath(segments.slice(start)),
        type: convertType,
        ignore_missing: true,
      },
    };
  }

  return {
    foreach: {
      tag,
      field: joinPath(segments.slice(start, arrayEnd + 1)),
      ignore_missing: true,
      processor: buildConvertNode({
        basePath: '_ingest._value',
        segments,
        start: arrayEnd + 1,
        arraySegments,
        convertType,
        tag,
      }),
    },
  };
};

const isGeneratedDescription = (description: unknown): boolean =>
  description === undefined ||
  description === LEGACY_FIELD_TYPE_PROCESSOR_DESCRIPTION ||
  (typeof description === 'string' && GENERATED_DESCRIPTION_PATTERN.test(description));

const buildFieldTypeProcessor = ({
  fieldName,
  type,
  convertType,
  documents,
  existing,
}: {
  fieldName: string;
  type: string;
  convertType: ConvertType;
  documents: ReadonlyArray<Record<string, unknown>>;
  existing: Processor | undefined;
}): Processor => {
  const segments = fieldName.split('.');
  const built = buildConvertNode({
    basePath: undefined,
    segments,
    start: 0,
    arraySegments: getArrayOfObjectsSegments(documents, segments),
    convertType,
    tag: getFieldTypeProcessorTag(fieldName),
  });
  const [builtType] = Object.keys(built);
  const builtConfig = built[builtType] as Record<string, unknown>;
  const { description: userDescription, ...userConfig } = Object.fromEntries(
    Object.entries(getProcessorConfig(existing) ?? {}).filter(
      ([key]) => !MANAGED_CONFIG_KEYS.has(key)
    )
  );

  return {
    [builtType]: {
      description: isGeneratedDescription(userDescription)
        ? getFieldTypeProcessorDescription(fieldName, type)
        : userDescription,
      ...userConfig,
      ...builtConfig,
    },
  };
};

/**
 * Rebuilds the generated convert processors from the field type edits and appends them at the end
 * of the pipeline. Settings a user added to a generated processor (such as `if`) are kept; its
 * field, tag, and type always come from the edit.
 */
export const syncFieldTypeProcessors = <T extends PipelineDefinition>(
  pipeline: T,
  fieldTypes: readonly FieldTypeEdit[],
  documents: ReadonlyArray<Record<string, unknown>>
): T => {
  const existing = groupGeneratedProcessors(pipeline);
  const generated = fieldTypes.flatMap(({ name, type, original_type: originalType }) => {
    const convertType = getConvertType(originalType, type);
    if (!convertType) return [];
    return [
      buildFieldTypeProcessor({
        fieldName: name,
        type,
        convertType,
        documents,
        existing: existing.get(name)?.[0],
      }),
    ];
  });

  const stripped = stripFieldTypeProcessors(pipeline);
  return { ...stripped, processors: [...getProcessors(stripped), ...generated] };
};

interface MappedField {
  name: string;
  type: string;
  is_ecs: boolean;
}

/**
 * Reads a generated processor added for a field without a type edit as a change to the processor's
 * type. It's an error when the field isn't an editable custom field, or the mapping alone already
 * gives it that type.
 */
const readBackAddedProcessors = (
  generated: Map<string, Processor[]>,
  fieldTypes: readonly FieldTypeEdit[],
  fieldMapping: readonly MappedField[],
  skipNames: ReadonlySet<string>
): { changes: Array<{ name: string; type: string }>; errors: FieldTypeProcessorError[] } => {
  const editedNames = new Set(fieldTypes.map(({ name }) => name));
  const mappings = new Map(fieldMapping.map((mapping) => [mapping.name, mapping]));
  const changes: Array<{ name: string; type: string }> = [];
  const errors: FieldTypeProcessorError[] = [];

  for (const [name, [processor]] of generated) {
    const convertType = findConvertConfig(processor)?.type;
    if (!editedNames.has(name) && !skipNames.has(name) && isConvertType(convertType)) {
      const type = CONVERT_TYPE_TO_FIELD_TYPE[convertType];
      const mapping = mappings.get(name);
      const isEditable = mapping && !mapping.is_ecs && mapping.type !== 'group';
      if (isEditable && getConvertType(mapping.type, type) === convertType) {
        changes.push({ name, type });
      } else {
        errors.push({ name, issue: 'unsupported_generated_processor' });
      }
    }
  }
  return { changes, errors };
};

/**
 * Turns user edits to the generated processors of the given field types into field type changes.
 * A deleted processor reverts its field to the original type, and a changed convert `type` changes
 * the field type. The current type is kept when it still maps to the processor's convert type (for
 * example `short` and `integer`). Duplicate or invalid generated processors are reported for any field.
 * With a field mapping, generated processors added by hand are read back too, except for `skipFields`.
 */
export const readBackFieldTypeProcessors = (
  pipeline: PipelineDefinition,
  fieldTypes: readonly FieldTypeEdit[],
  added?: { fieldMapping: readonly MappedField[]; skipFields?: ReadonlySet<string> }
): { changes: Array<{ name: string; type: string }>; errors: FieldTypeProcessorError[] } => {
  const generated = groupGeneratedProcessors(pipeline);
  const errors: FieldTypeProcessorError[] = [...generated.entries()].flatMap(
    ([name, processors]): FieldTypeProcessorError[] => {
      if (processors.length > 1) return [{ name, issue: 'duplicate_generated_processor' }];
      return isConvertType(findConvertConfig(processors[0])?.type)
        ? []
        : [{ name, issue: 'invalid_convert_type' }];
    }
  );
  const invalidNames = new Set(errors.map(({ name }) => name));
  const changes = fieldTypes.flatMap(({ name, type, original_type: originalType }) => {
    const expectedConvertType = getConvertType(originalType, type);
    if (!expectedConvertType || invalidNames.has(name)) return [];

    const [processor] = generated.get(name) ?? [];
    if (!processor) return [{ name, type: originalType }];

    const convertType = findConvertConfig(processor)?.type;
    if (convertType === expectedConvertType || !isConvertType(convertType)) return [];
    return [{ name, type: CONVERT_TYPE_TO_FIELD_TYPE[convertType] }];
  });
  if (!added) return { changes, errors };

  const addedResult = readBackAddedProcessors(
    generated,
    fieldTypes,
    added.fieldMapping,
    new Set([...invalidNames, ...(added.skipFields ?? [])])
  );
  return {
    changes: [...changes, ...addedResult.changes],
    errors: [...errors, ...addedResult.errors],
  };
};
