/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { isUnsafeProperty, mergeObjectElements, mergeSamples } from '../../../common';
import type { FieldMapping } from '../../agents/state';
import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';

const determineType = (value: unknown): string => {
  if (typeof value === 'object' && value !== null) return 'group';
  if (typeof value === 'string') return 'keyword';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'long' : 'double';
  return 'keyword';
};

interface RawField {
  name: string;
  type: string;
}

const collectFields = (obj: unknown, parentPath: string): RawField[] => {
  if (typeof obj !== 'object' || obj === null) {
    return [{ name: parentPath, type: determineType(obj) }];
  }

  if (Array.isArray(obj)) {
    const mergedElements = mergeObjectElements(obj);
    if (mergedElements) {
      return collectFields(mergedElements, parentPath);
    }
    return [{ name: parentPath, type: determineType(obj.find((element) => element != null)) }];
  }

  const fields: RawField[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (!isUnsafeProperty(key)) {
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;
      fields.push(...collectFields(value, fieldPath));
    }
  }
  return fields;
};

/**
 * Generates field mappings from pipeline output documents.
 * Merges all docs into a single representative object, walks the structure,
 * and produces a flat list of fields with their types and ECS status.
 *
 * ECS status is determined by querying the fields_metadata plugin which
 * maintains the canonical list of ECS field definitions.
 */
export const generateFieldMappings = async (
  pipelineDocs: Array<Record<string, unknown>>,
  fieldsMetadataClient: IFieldsMetadataClient,
  agentFieldMappings?: FieldMapping[]
): Promise<FieldMappingEntry[]> => {
  if (pipelineDocs.length === 0) return [];

  const merged = mergeSamples(pipelineDocs);
  const rawFields: RawField[] = [];

  for (const [key, value] of Object.entries(merged)) {
    if (!isUnsafeProperty(key)) {
      rawFields.push(...collectFields(value, key));
    }
  }

  if (rawFields.length === 0) return [];

  const agentTypeMap = new Map<string, string>();
  if (agentFieldMappings) {
    for (const mapping of agentFieldMappings) {
      agentTypeMap.set(mapping.name, mapping.type);
    }
  }

  const allFieldNames = rawFields.map((f) => f.name);
  const ecsFieldsDict = await fieldsMetadataClient.find({
    fieldNames: allFieldNames,
    source: ['ecs'],
  });
  const ecsFieldsMap = ecsFieldsDict.toPlain();

  return rawFields.map((f) => {
    const ecsEntry = ecsFieldsMap[f.name];
    const isEcs = !!ecsEntry;
    const agentType = agentTypeMap.get(f.name);
    return {
      ...f,
      type: isEcs && ecsEntry.type ? ecsEntry.type : agentType ?? f.type,
      is_ecs: isEcs,
    };
  });
};
