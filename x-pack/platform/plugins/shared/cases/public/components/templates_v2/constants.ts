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

export const MAX_TEMPLATES_PER_FILE = 100;

export const MAX_TOTAL_IMPORT_TEMPLATES = 100;

export const TEMPLATE_PREVIEW_WIDTH_KEY = 'CASES_TEMPLATE_PREVIEW_WIDTH';
export const MIN_PREVIEW_WIDTH = 250;
export const MIN_EDITOR_WIDTH = 400;

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
  renderWhitespace: 'all',
  wordWrapColumn: 80,
  wrappingIndent: 'indent',
  formatOnType: true,
};
