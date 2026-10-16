/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack } from '@elastic/isomer-sdk';
import { markdown } from './primitives/markdown';

export const componentsPrimitives = [markdown] as const;

/** Kibana's content and layout primitives. */
export const componentsPack = definePrimitivePack({
  id: 'components',
  primitives: componentsPrimitives,
  authoring: {
    groups: [{ title: 'Narrative and content', types: ['markdown'] }],
  },
});
