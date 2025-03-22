/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDescriptor } from '@kbn/data-views-plugin/server';
import { AlertFieldCategoriesMap } from '@kbn/alerting-types';
// @ts-expect-error TODO Missing export and type definitions
import { EcsNested } from '@elastic/ecs/generated/ecs_nested';
import { FieldDescriptorWithMetadata } from '../../../common/types';

const getFieldCategory = (fieldCapability: FieldDescriptor) => {
  const name = fieldCapability.name.split('.');
  if (name.length === 1) {
    return 'base';
  }
  return name[0];
};

/**
 * Groups the list of field specs into a map from category to field name to field spec
 * @example
 * ```ts
 * {
 *   base: {
 *     fields: {
 *       '@timestamp': { ... },
 *     },
 *   },
 *   kibana: { ... },
 *   ...
 * }
 * ```
 */
export const groupAlertFieldsByCategory = (
  fields: FieldDescriptorWithMetadata[]
): AlertFieldCategoriesMap => {
  return fields.reduce((alertFields, field) => {
    const category = getFieldCategory(field);
    const ecsCategoryData = EcsNested[category as keyof typeof EcsNested];
    if (!alertFields[category]) {
      const { fields: _, ...categoryData } = ecsCategoryData ?? {};
      alertFields[category] = { name: category, fields: {}, ...categoryData };
    }
    alertFields[category].fields[field.name] = { ...field, category };
    return alertFields;
  }, {} as AlertFieldCategoriesMap);
};
