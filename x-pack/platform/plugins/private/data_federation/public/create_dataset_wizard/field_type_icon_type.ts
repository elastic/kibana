/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maps index-management main types missing from `@kbn/react-field`'s icon map
 * to a similar type that already has a field token icon.
 */
const FIELD_TYPE_ICON_ALIASES: Record<string, string> = {
  alias: 'keyword',
  completion: 'search_as_you_type',
  join: 'nested',
  numeric: 'number',
  object: 'nested',
  range: 'number_range',
  token_count: 'number',
};

export const normalizeFieldTypeForIcon = (type: string): string =>
  FIELD_TYPE_ICON_ALIASES[type] ?? type;
