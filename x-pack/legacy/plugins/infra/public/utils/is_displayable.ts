/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldType } from 'ui/index_patterns';
import { startsWith, uniq } from 'lodash';
import { getAllowedListForPrefix } from '../../common/ecs_allowed_list';

interface DisplayableFieldType extends FieldType {
  displayable?: boolean;
}

const fieldStartsWith = (field: DisplayableFieldType) => (name: string) =>
  startsWith(field.name, name);

export const isDisplayable = (field: DisplayableFieldType, additionalPrefixes: string[] = []) => {
  // We need to start with at least one prefix, even if it's empty
  const prefixes = additionalPrefixes && additionalPrefixes.length ? additionalPrefixes : [''];
  // Create a set of allowed list based on the prefixes
  const allowedList = prefixes.reduce((acc, prefix) => {
    return uniq([...acc, ...getAllowedListForPrefix(prefix)]);
  }, [] as string[]);
  // If the field is displayable and part of the allowed list or covered by the prefix
  return (
    (field.displayable && prefixes.some(fieldStartsWith(field))) ||
    allowedList.some(fieldStartsWith(field))
  );
};
