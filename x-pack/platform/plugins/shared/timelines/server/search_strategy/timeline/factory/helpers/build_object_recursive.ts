/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { get } from 'lodash/fp';
import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { Fields } from '../../../../../common/search_strategy';
import { toStringArray } from '../../../../../common/utils/to_array';
import { getNestedParentPath } from './get_nested_parent_path';

export const buildObjectRecursive = (fieldPath: string, fields: Fields): Partial<Ecs> => {
  const nestedParentPath = getNestedParentPath(fieldPath, fields);
  if (!nestedParentPath) {
    return set({}, fieldPath, toStringArray(get(fieldPath, fields)));
  }

  const subPath = fieldPath.replace(`${nestedParentPath}.`, '');
  const subFields = (get(nestedParentPath, fields) ?? []) as Fields[];
  return set(
    {},
    nestedParentPath,
    subFields.map((subField) => buildObjectRecursive(subPath, subField))
  );
};
