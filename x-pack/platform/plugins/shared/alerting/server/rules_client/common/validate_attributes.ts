/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { get } from 'lodash';
import { alertMappings } from '../../../common/saved_objects/rules/mappings';

const astFunctionType = ['is', 'range', 'nested'];

export const getFieldNameAttribute = (fieldName: string, attributesToIgnore: string[]) => {
  const fieldNameSplit = (fieldName || '')
    .split('.')
    .filter((fn: string) => !attributesToIgnore.includes(fn));

  return fieldNameSplit.length > 0 ? fieldNameSplit[0] : '';
};

export interface IterateActionProps {
  ast: KueryNode;
  index: number;
  fieldName: string;
  localFieldName: string;
}

export interface IterateFilterKureyNodeParams {
  astFilter: KueryNode;
  hasNestedKey?: boolean;
  nestedKeys?: string;
  storeValue?: boolean;
  path?: string;
  action?: (props: IterateActionProps) => void;
}

export interface ValidateFilterKueryNodeParams extends IterateFilterKureyNodeParams {
  excludedFieldNames: string[];
}

export const iterateFilterKureyNode = ({
  astFilter,
  hasNestedKey = false,
  nestedKeys,
  storeValue,
  path = 'arguments',
  action = () => {},
}: IterateFilterKureyNodeParams) => {
  let localStoreValue = storeValue;
  let localNestedKeys: string | undefined;
  let localFieldName = '';
  if (localStoreValue === undefined) {
    localStoreValue = astFilter.type === 'function' && astFunctionType.includes(astFilter.function);
  }

  astFilter.arguments.forEach((ast: KueryNode, index: number) => {
    if (hasNestedKey && ast.type === 'literal' && ast.value != null) {
      localNestedKeys = ast.value;
    } else if (ast.type === 'literal' && ast.value && typeof ast.value === 'string') {
      const key = ast.value.replace('.attributes', '');
      const mappingKey = 'properties.' + key.split('.').join('.properties.');
      const field = get(alertMappings, mappingKey);
      if (field != null && field.type === 'nested') {
        localNestedKeys = ast.value;
      }
    }

    if (ast.arguments) {
      const myPath = `${path}.${index}`;
      iterateFilterKureyNode({
        astFilter: ast,
        storeValue: ast.type === 'function' && astFunctionType.includes(ast.function),
        path: `${myPath}.arguments`,
        hasNestedKey: ast.type === 'function' && ast.function === 'nested',
        nestedKeys: localNestedKeys || nestedKeys,
        action,
      });
    }

    if (localStoreValue) {
      const fieldName = nestedKeys != null ? `${nestedKeys}.${ast.value}` : ast.value;

      if (index === 0) {
        localFieldName = fieldName;
      }

      action({
        ast,
        index,
        fieldName,
        localFieldName,
      });
    }
  });
};
