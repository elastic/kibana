/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack } from '@elastic/isomer-sdk';
import { ISOMER_STYLE_COLLECTOR, isomerStyleAdapter } from '@kbn/isomer-theme';
import type {
  ActionsNode,
  CodeNode,
  ContextNode,
  DividerNode,
  FieldsNode,
  HeaderNode,
  LinkNode,
  MarkdownNode,
  QuoteNode,
  SectionNode,
  TableNode,
} from './primitives';
import {
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
} from './primitives';
import { codeCopyEnhancement } from './primitives/code';
import { tableSortEnhancement } from './primitives/table';

/** Primitive definitions registered by `componentsPack`. */
export const componentsPrimitives = [
  markdown,
  header,
  section,
  context,
  divider,
  quote,
  actions,
  link,
  fields,
  code,
  table,
  unsupported,
] as const;

/** A node of any of the pack's primitives, one per entry of {@link componentsPrimitives}. */
export type ComponentsNode =
  | MarkdownNode
  | HeaderNode
  | SectionNode
  | ContextNode
  | DividerNode
  | QuoteNode
  | ActionsNode
  | LinkNode
  | FieldsNode
  | CodeNode
  | TableNode;

/** Kibana's content and layout primitives. */
export const componentsPack = definePrimitivePack({
  id: 'components',
  primitives: componentsPrimitives,
  styleAdapter: isomerStyleAdapter,
  styleCollector: ISOMER_STYLE_COLLECTOR,
  enhancements: [codeCopyEnhancement, tableSortEnhancement],
  authoring: {
    groups: [
      { title: 'Narrative and content', types: ['markdown'] },
      {
        title: 'Message layout',
        types: ['header', 'section', 'context', 'divider', 'quote', 'actions', 'link'],
      },
      { title: 'Data', types: ['fields', 'code', 'table'] },
      { title: 'Status', types: ['unsupported'] },
    ],
  },
});
