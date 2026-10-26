/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import { REF_FIELD_COMPLETION_DETAIL, REF_FIELD_COMPLETION_GLOBAL } from '../translations';

/**
 * The 1-based column span an accepted `$ref` suggestion should replace (the partial the author has
 * already typed after `$ref:`), so completing never duplicates characters.
 */
export interface RefCompletionContext {
  replaceStartColumn: number;
  replaceEndColumn: number;
}

/**
 * A `$ref` autocomplete entry derived from a field-library definition, kept free of Monaco types so
 * it can be unit tested; the hook maps it onto a Monaco `CompletionItem`.
 */
export interface RefFieldSuggestion {
  name: string;
  detail: string;
  description?: string;
}

/**
 * Returns the replacement span when the cursor sits in a `$ref:` value position on the current
 * line (e.g. `  - $ref: roo|`), or `null` otherwise. Only the text on the line up to the cursor is
 * inspected, so a `$ref` key elsewhere on a different line never triggers a suggestion here.
 */
export const getRefCompletionContext = (
  textBeforeCursor: string,
  cursorColumn: number
): RefCompletionContext | null => {
  const match = textBeforeCursor.match(/^\s*(?:-\s+)?\$ref:[ \t]*(\S*)$/);
  if (!match) {
    return null;
  }
  const partial = match[1] ?? '';
  return {
    replaceStartColumn: cursorColumn - partial.length,
    replaceEndColumn: cursorColumn,
  };
};

/**
 * Builds the `$ref` suggestion list from the owner's field-library definitions. Global fields are
 * labeled distinctly so an author can tell an org-wide field from a plain library reference.
 */
export const buildRefFieldSuggestions = (
  fieldDefinitions: FieldDefinition[]
): RefFieldSuggestion[] =>
  fieldDefinitions.map((fieldDefinition) => ({
    name: fieldDefinition.name,
    detail: fieldDefinition.isGlobal ? REF_FIELD_COMPLETION_GLOBAL : REF_FIELD_COMPLETION_DETAIL,
    description: fieldDefinition.description,
  }));
