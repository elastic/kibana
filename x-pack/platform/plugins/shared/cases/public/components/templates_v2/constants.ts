/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/monaco';
import type { TemplatesFindRequest } from '../../../common/types/api/template/v1';

export const PAGE_SIZE_OPTIONS: number[] = [10, 25, 50, 100];

export const TEMPLATES_STATE_URL_KEY = 'templates';

export const SORT_ORDER_VALUES: Array<'asc' | 'desc'> = ['asc', 'desc'];

export const DEFAULT_QUERY_PARAMS: TemplatesFindRequest = {
  page: 1,
  perPage: PAGE_SIZE_OPTIONS[0],
  sortField: 'name',
  sortOrder: 'asc',
  search: '',
  tags: [],
  author: [],
  owner: [],
  isDeleted: false,
  isEnabled: undefined,
};

export const LINE_CLAMP = 3;

/**
 * `perPage` used by the sidebar/header template selectors, which need the full list of
 * enabled templates to populate a combo box rather than a paginated table.
 */
export const TEMPLATE_SELECTOR_PAGE_SIZE = 10000;

export const MAX_TEMPLATES_PER_FILE = 100;

export const MAX_TOTAL_IMPORT_TEMPLATES = 100;

export const TEMPLATE_PREVIEW_WIDTH_KEY = 'CASES_TEMPLATE_PREVIEW_WIDTH';
export const MIN_PREVIEW_WIDTH = 250;
export const MIN_EDITOR_WIDTH = 400;

/**
 * Root keys that must always be present in the editor "blueprint" YAML: the case defaults plus
 * `fields`. This single list drives both the programmatic completeness check
 * (validate_template_definition) and the Monaco schema's `required` hint (template_json_schema), so
 * the two never drift. `settings`/`connector` are intentionally excluded — they are panel-owned
 * (edited on the Configuration tab, merged into the definition on save) and are never part of the
 * editor buffer, so they must not gate the YAML.
 */
export const REQUIRED_TEMPLATE_ROOT_KEYS = [
  'name',
  'description',
  'severity',
  'category',
  'tags',
  'assignees',
  'fields',
] as const;

export const YAML_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true,
  lineNumbers: 'on',
  glyphMargin: true,
  tabSize: 2,
  lineNumbersMinChars: 2,
  insertSpaces: true,
  fontSize: 14,
  lineHeight: 23,
  renderWhitespace: 'all',
  wordWrapColumn: 80,
  wrappingIndent: 'indent',
  formatOnType: true,
  // Breathing room at the top/bottom of the scroll area, matching the Workflows editor.
  padding: {
    top: 16,
    bottom: 16,
  },
};
