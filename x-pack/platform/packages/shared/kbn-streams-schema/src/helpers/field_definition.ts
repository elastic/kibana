/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { FieldDefinitionConfig, InheritedFieldDefinition, WiredStreamDefinition } from '../models';

// Parameters that we consider first class and provide a curated experience for, or are added as metadata.
const FIRST_CLASS_PARAMETERS = ['type', 'format', 'from'];

// Advanced parameters that we provide a generic experience (JSON blob) for
export const getAdvancedParameters = (fieldName: string, fieldConfig: FieldDefinitionConfig) => {
  // @timestamp can't ignore malformed dates as it's used for sorting in logsdb
  const additionalOmissions = fieldName === '@timestamp' ? ['ignore_malformed'] : [];
  return omit(fieldConfig, FIRST_CLASS_PARAMETERS.concat(additionalOmissions));
};

export const getInheritedFieldsFromAncestors = (ancestors: WiredStreamDefinition[]) => {
  return ancestors.reduce<InheritedFieldDefinition>((acc, def) => {
    Object.entries(def.ingest.wired.fields).forEach(([key, fieldDef]) => {
      acc[key] = { ...fieldDef, from: def.name };
    });
    return acc;
  }, {});
};
