/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html#_core_datatypes
 *
 * ```
 * Field types are grouped by _family_. Types in the same family have exactly
 * the same search behavior but may have different space usage or
 * performance characteristics.
 *
 * Currently, there are two type families, `keyword` and `text`. Other type
 * families have only a single field type. For example, the `boolean` type
 * family consists of one field type: `boolean`.
 * ```
 */
export const fieldTypeFamilies: Record<string, Set<string>> = {
  keyword: new Set(['keyword', 'constant_keyword', 'wildcard']),
  text: new Set(['text', 'match_only_text']),
};

export const getIsInSameFamily = ({
  ecsExpectedType,
  type,
}: {
  ecsExpectedType: string | undefined;
  type: string;
}): boolean => {
  if (ecsExpectedType != null) {
    const allFamilies = Object.values(fieldTypeFamilies);

    return allFamilies.reduce<boolean>(
      (acc, family) => (acc !== true ? family.has(ecsExpectedType) && family.has(type) : acc),
      false
    );
  } else {
    return false;
  }
};
