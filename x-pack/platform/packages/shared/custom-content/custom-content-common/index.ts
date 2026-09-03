/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
  CUSTOM_CONTENT_SCRIPT_PATTERN,
} from './constants';

export {
  customContentStateSchema,
  customContentUpdateSchema,
  customContentPanelUpdateSchema,
  readEsqlQuery,
  toEsqlQueryState,
  resolveEsqlQueryEdit,
} from './schema';
export type { CustomContentUpdate } from './schema';
export type { ResolvedEsqlQueryEdit, CustomContentState } from './schema';

export { stripMarkdownFences } from './strip_markdown_fences';
