/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_HEADING_LENGTH } from '../constants';
import { defineCapability } from './define_capability';

export const flyoutCapability = defineCapability({
  kind: 'component',
  id: 'flyout',
  version: 1,
  props: lazySchema(() =>
    z.object({
      title: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .describe('The title of the panel. It may use {{state.key}}.'),
    })
  ),
  doc: {
    summary: 'a side panel that an action opens.',
    whenToUse: 'For detail that should not take room on the page until it is asked for.',
    example: { type: 'flyout', id: 'detail', title: 'Detail', children: [] },
  },
  interpolated: ['title'],
  container: true,
  overlay: true,
});
