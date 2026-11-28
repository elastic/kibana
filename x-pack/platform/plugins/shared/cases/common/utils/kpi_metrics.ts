/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSafeExtendedFieldKey } from './template_fields';

const EXTENDED_FIELDS_PREFIX = 'case.extended_fields.';
const KEYWORD_KEY_SUFFIX = '_as_keyword';

/**
 * Returns true for a keyword extended field of the cases index, for example `case.extended_fields.team_as_keyword`.
 */
export const isKpiExtendedKeywordField = (field: string): boolean => {
  if (!field.startsWith(EXTENDED_FIELDS_PREFIX)) {
    return false;
  }

  const key = field.slice(EXTENDED_FIELDS_PREFIX.length);

  return (
    key.length > KEYWORD_KEY_SUFFIX.length &&
    key.endsWith(KEYWORD_KEY_SUFFIX) &&
    isSafeExtendedFieldKey(key)
  );
};
