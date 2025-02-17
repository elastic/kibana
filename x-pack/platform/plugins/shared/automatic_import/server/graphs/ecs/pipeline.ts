/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { load } from 'js-yaml';
import { Environment, FileSystemLoader } from 'nunjucks';
import { join as joinPath } from 'path';
import { Pipeline, ESProcessorItem } from '../../../common';
import type { EcsMappingState } from '../../types';
import { ECS_TYPES } from './constants';
import { deepCopy } from '../../util/util';
import { type FieldPath, fieldPathToProcessorString } from '../../util/fields';
import { fieldPathToPainlessExpression, SafePainlessExpression } from '../../util/painless';

interface ECSField {
  target: string;
  confidence: number;
  date_formats: string[];
  type: string;
}

const KNOWN_ES_TYPES = ['long', 'float', 'scaled_float', 'ip', 'boolean', 'keyword'];
type KnownESType = (typeof KNOWN_ES_TYPES)[number];

/**
 * Clarifies the types of specific fields in pipeline processors.
 *
 * This includes safety requirements for Painless script fields.
 * Restricted to the processors that we generate in this file.
 */
interface SafeESProcessorItem extends ESProcessorItem {
  [k: string]: {
    field?: string;
    if?: SafePainlessExpression;
    ignore_missing?: boolean;
    target_field?: string;
    type?: KnownESType;
    formats?: string[];
  };
}

function generateProcessor(
  currentPath: FieldPath,
  ecsField: ECSField,
  expectedEcsType: string,
  sampleValue: unknown
): SafeESProcessorItem {
  if (needsTypeConversion(sampleValue, expectedEcsType)) {
    return {
      convert: {
        field: fieldPathToProcessorString(currentPath),
        target_field: ecsField.target,
        type: getConvertProcessorType(expectedEcsType),
        ignore_missing: true,
      },
    };
  }

  if (ecsField.type === 'date') {
    return {
      date: {
        field: fieldPathToProcessorString(currentPath),
        target_field: ecsField.target,
        formats: convertIfIsoDate(ecsField.date_formats),
        if: fieldPathToPainlessExpression(currentPath),
      },
    };
  }

  return {
    rename: {
      field: fieldPathToProcessorString(currentPath),
      target_field: ecsField.target,
      ignore_missing: true,
    },
  };
}

// While some custom date formats might use the 'T' representation of time widely used in ISO8601, this function only appends the 'ISO8601' format to the date processor as a fallback.
// This is because many vendors tend to use multiple versions representing seconds, milli, nano etc, and the format returned by the LLM usually hits most but not all.
// Since log samples can be inconclusive we add the ISO8601 format as a fallback to ensure the date processor can handle all of the combinations of values.
function convertIfIsoDate(date: string[]): string[] {
  if (date.some((d) => d.includes('T'))) {
    if (date.some((d) => d === 'ISO8601')) {
      return date;
    }
    return [...date, 'ISO8601'];
  }
  return date;
}

function getSampleValue(fieldPath: FieldPath, samples: Record<string, any>): unknown {
  let value: any = samples;
  for (const k of fieldPath) {
    if (value === undefined || value === null) {
      return null;
    }
    value = value[k];
  }
  return value;
}

function getEcsType(ecsField: ECSField, ecsTypes: Record<string, string>): string {
  const ecsTarget = ecsField.target;
  return ecsTypes[ecsTarget];
}

function getConvertProcessorType(expectedEcsType: KnownESType): KnownESType {
  if (expectedEcsType === 'long') {
    return 'long';
  }
  if (['scaled_float', 'float'].includes(expectedEcsType)) {
    return 'float';
  }
  if (expectedEcsType === 'ip') {
    return 'ip';
  }
  if (expectedEcsType === 'boolean') {
    return 'boolean';
  }
  return 'string';
}

function needsTypeConversion(sample: unknown, expected: KnownESType): boolean {
  if (sample === null || sample === undefined) {
    return false;
  }

  if (expected === 'ip') {
    return true;
  }

  if (expected === 'boolean' && typeof sample !== 'boolean') {
    return true;
  }

  if (['long', 'float', 'scaled_float'].includes(expected) && typeof sample !== 'number') {
    return true;
  }

  if (
    ['keyword', 'wildcard', 'match_only_text', 'constant_keyword'].includes(expected) &&
    !(typeof sample === 'string' || Array.isArray(sample))
  ) {
    return true;
  }

  // If types are anything but the above, we return false. Example types:
  // "nested", "flattened", "object", "geopoint", "date"
  return false;
}

export function generateProcessors(
  ecsMapping: object,
  samples: object,
  basePath: FieldPath = []
): SafeESProcessorItem[] {
  if (Object.keys(ecsMapping).length === 0) {
    return [];
  }
  const ecsTypes = ECS_TYPES;
  const valueFieldKeys = new Set(['target', 'confidence', 'date_formats', 'type']);
  const results: SafeESProcessorItem[] = [];

  for (const [key, value] of Object.entries(ecsMapping)) {
    const currentPath = [...basePath, key];
    if (value !== null && !Array.isArray(value) && typeof value === 'object') {
      const valueKeys = new Set(Object.keys(value));
      if (value?.target != null && [...valueFieldKeys].every((k) => valueKeys.has(k))) {
        const processor = generateProcessor(
          currentPath,
          value as ECSField,
          getEcsType(value as ECSField, ecsTypes),
          getSampleValue(currentPath, samples)
        );
        results.push(processor);
      } else {
        results.push(...generateProcessors(value, samples, currentPath));
      }
    }
  }

  return results;
}

export function createPipeline(state: EcsMappingState): Pipeline {
  const samples = JSON.parse(state.combinedSamples);

  const processors = generateProcessors(state.finalMapping, samples);

  // Retrieve all source field names from convert processors to populate single remove processor:
  const fieldsToRemove = processors
    .map((p: any) => p.convert?.field)
    .filter((f: unknown) => f != null);
  const mappedValues = {
    processors,
    ecs_version: state.ecsVersion,
    package_name: state.packageName,
    data_stream_name: state.dataStreamName,
    log_format: state.samplesFormat.name,
    fields_to_remove: fieldsToRemove,
  };
  const templatesPath = joinPath(__dirname, '../../templates');
  const env = new Environment(new FileSystemLoader(templatesPath), {
    autoescape: false,
  });
  env.addFilter('includes', function (str, substr) {
    return str.includes(substr);
  });
  env.addFilter('startswith', function (str, prefix) {
    return str.startsWith(prefix);
  });
  const template = env.getTemplate('pipeline.yml.njk');
  const renderedTemplate = template.render(mappedValues);
  let ingestPipeline = load(renderedTemplate) as Pipeline;
  if (state.additionalProcessors.length > 0) {
    ingestPipeline = combineProcessors(ingestPipeline, state.additionalProcessors);
  }
  return ingestPipeline;
}

export function combineProcessors(
  initialPipeline: Pipeline,
  processors: ESProcessorItem[]
): Pipeline {
  // Create a deep copy of the initialPipeline to avoid modifying the original input
  const currentPipeline = deepCopy(initialPipeline);
  const currentProcessors = currentPipeline.processors;
  const combinedProcessors = [
    ...currentProcessors.slice(0, 2),
    ...processors,
    ...currentProcessors.slice(2),
  ];
  currentPipeline.processors = combinedProcessors;
  return currentPipeline;
}
