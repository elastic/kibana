/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineProcessor } from '../../../../types/processors/ingest_pipeline_processors';
import type { ProcessorType, StreamlangProcessorDefinition } from '../../../../types/processors';

/**
 * Mapping of Streamlng processor fields to Ingest processor fields.
 */
export const processorFieldRenames: Record<string, Record<string, string>> = {
  grok: { from: 'field', where: 'if' },
  dissect: { from: 'field', where: 'if' },
  date: { from: 'field', to: 'target_field', where: 'if' },
  rename: { from: 'field', to: 'target_field', where: 'if' },
  set: { to: 'field', where: 'if' },
  append: { to: 'field', where: 'if' },
  manual_ingest_pipeline: { where: 'if' },
};

export function renameFields<T extends Record<string, any>>(
  obj: T,
  renames: Record<string, string>
): T {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = renames[key] || key;
      result[newKey] = obj[key];
    }
  }
  return result as T;
}

export const applyPreProcessing = (
  action: StreamlangProcessorDefinition['action'],
  processorWithRenames: IngestPipelineProcessor
): IngestProcessorContainer[] => {
  const pipeline = [
    {
      [action]: { ...processorWithRenames },
    },
  ];

  // if processorType is not part of templatableFields, return processor as is
  if (!Object.keys(templatableFields).includes(action)) {
    return pipeline;
  }

  const fieldsToEscape = templatableFields[action];
  let beforeProcessors: IngestProcessorContainer[] = [];
  let afterProcessors: IngestProcessorContainer[] = [];

  if (!fieldsToEscape || !fieldsToEscape.length || !processorWithRenames) {
    return pipeline;
  }

  // Foe each field of the processor that supports templating, check if it needs to be escaped
  // If yes, add the necessary pre and post processors
  for (const field of fieldsToEscape) {
    const fieldValue = processorWithRenames[field as keyof IngestPipelineProcessor];
    if (
      typeof field === 'string' &&
      (typeof fieldValue === 'string' || Array.isArray(fieldValue)) &&
      field &&
      fieldValue
    ) {
      const { before, preProcessedValue, after } = getPreProcessorsForTemplateEscaping(
        action as ProcessorType,
        field,
        fieldValue
      );
      if (before.length) {
        beforeProcessors = [...beforeProcessors, ...before];
      }
      if (after.length) {
        afterProcessors = [...afterProcessors, ...after];
      }
      processorWithRenames[field as keyof IngestPipelineProcessor] = preProcessedValue as any;

      pipeline[0][action] = { ...processorWithRenames };
    }
  }

  return [...beforeProcessors, ...pipeline, ...afterProcessors];
};

/**
 * A mapping of processor types to the fields that support Mustache templating
 * in Ingest Pipelines.
 */

export const templatableFields: Partial<
  Record<ProcessorType, Array<IngestPipelineProcessor[keyof IngestPipelineProcessor]>>
> = {
  set: ['field', 'value'],
  rename: ['field', 'target_field'],
  append: ['field', 'value'],
};

/**
 * Checks if a field's value is a template (contains two or more opening braces at the start and end).
 * If a field is a mustache template while the field is templatable, the function provides
 * pre-processors to escape template parsing in Ingest Pipeline.
 *
 * Since there's no direct way to escape/disable Mustache templates in Ingest Pipelines, a temp
 * field is created to hold the original template value. A `script` processor assigns the template
 * value (as literal unparsed string) to the temp field. Then, the main processor uses the temp
 * field as its value using the `{{temp_field}}`.
 *
 * After the main processor, the temp field is removed using a `remove` processor.
 */
export function getPreProcessorsForTemplateEscaping(
  processor: ProcessorType,
  field: string,
  value: string | string[]
) {
  const unprocessResponse = { before: [], preProcessedValue: value, after: [] };
  const values = Array.isArray(value) ? value : [value];

  if (!values.length) {
    return unprocessResponse;
  }

  let allBefore: IngestProcessorContainer[] = [];
  let allAfter: IngestProcessorContainer[] = [];
  const preProcessedValues: string[] = [];

  for (const [index, val] of values.entries()) {
    const { before, preProcessedValue, after } = getEscapedProcessorsForField(
      processor,
      field,
      val,
      index
    );
    allBefore = [...allBefore, ...before];
    allAfter = [...allAfter, ...after];
    preProcessedValues.push(preProcessedValue);
  }

  return {
    before: allBefore,
    preProcessedValue: Array.isArray(value) ? preProcessedValues : preProcessedValues[0],
    after: allAfter,
  };
}

function getEscapedProcessorsForField(
  processor: ProcessorType,
  field: string,
  value: string,
  index: number
) {
  const unprocessResponse = { before: [], preProcessedValue: value, after: [] };

  // If value is falsy or does not contain '{{' or '}}', return original value
  if (!value || (!value.includes('{{') && !value.includes('}}'))) {
    return unprocessResponse;
  }

  const isFieldTemplatable = templatableFields[processor]?.includes(field) ?? false;
  if (!isFieldTemplatable) {
    return unprocessResponse;
  }

  const tempField = `__escaped__${field}${index > 0 ? `__${index}` : ''}`;
  const preProcessedValue = `{{${tempField}}}`; // It'll resolve to the value of the temp field
  const before = [{ script: { source: `ctx['${tempField}'] = '${value}'` } }];
  const after = [{ remove: { field: tempField } }];

  return { before, preProcessedValue, after };
}
