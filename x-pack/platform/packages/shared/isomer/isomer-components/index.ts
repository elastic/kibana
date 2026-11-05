/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Kibana's shared primitive pack for rendering Isomer content. */
export { type ComponentsNode, componentsPack, componentsPrimitives } from './src/pack';
/** Context values available to component renderers. */
export type { ComponentsRenderContext } from './src/lib';
/** Enhancement identifiers used by component renderers. */
export { CODE_COPY_ENHANCEMENT } from './src/primitives/code';
export { TABLE_SORT_ENHANCEMENT } from './src/primitives/table';
/** Component primitives and their node types. */
export {
  type ActionsNode,
  type CodeNode,
  type ContextNode,
  type DividerNode,
  type FieldsNode,
  type HeaderNode,
  type LinkNode,
  type MarkdownNode,
  type QuoteNode,
  type SectionNode,
  type TableNode,
  type UnsupportedNode,
  actions,
  code,
  context,
  divider,
  fields,
  header,
  link,
  markdown,
  quote,
  section,
  table,
  unsupported,
} from './src/primitives';
