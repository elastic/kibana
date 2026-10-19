/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack } from '@elastic/isomer-sdk';
import { ISOMER_STYLE_COLLECTOR, isomerStyleAdapter } from '@kbn/isomer-theme';
import {
  actions,
  code,
  context,
  divider,
  fields,
  header,
  markdown,
  quote,
  section,
  table,
} from './primitives';

export const componentsPrimitives = [
  markdown,
  header,
  section,
  context,
  divider,
  quote,
  actions,
  fields,
  code,
  table,
] as const;

/** Kibana's content and layout primitives. */
export const componentsPack = definePrimitivePack({
  id: 'components',
  primitives: componentsPrimitives,
  styleAdapter: isomerStyleAdapter,
  styleCollector: ISOMER_STYLE_COLLECTOR,
  authoring: {
    groups: [
      { title: 'Narrative and content', types: ['markdown'] },
      {
        title: 'Message layout',
        types: ['header', 'section', 'context', 'divider', 'quote', 'actions'],
      },
      { title: 'Data', types: ['fields', 'code', 'table'] },
    ],
  },
});
