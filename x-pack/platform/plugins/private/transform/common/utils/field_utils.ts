/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KEYWORD_POSTFIX = '.keyword';

// checks if fieldName has a `fieldName.keyword` equivalent in the set of all field names.
export const hasKeywordDuplicate = (fieldName: string, fieldNamesSet: Set<string>): boolean =>
  fieldNamesSet.has(`${fieldName}${KEYWORD_POSTFIX}`);

// checks if a fieldName ends with `.keyword` and has a field name equivalent without the postfix in the set of all field names.
export const isKeywordDuplicate = (fieldName: string, fieldNamesSet: Set<string>): boolean =>
  fieldName.endsWith(KEYWORD_POSTFIX) && fieldNamesSet.has(removeKeywordPostfix(fieldName));

// removes the `.keyword` postfix form a field name if applicable
export const removeKeywordPostfix = (fieldName: string): string =>
  fieldName.replace(new RegExp(`${KEYWORD_POSTFIX}$`), '');
