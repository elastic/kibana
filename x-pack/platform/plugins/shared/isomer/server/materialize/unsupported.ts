/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MaterializedNodeSource, UnsupportedNode } from './nodes';
import { UNSUPPORTED_NODE_TYPE } from './nodes';
import type { MaterializeDescription } from './types';

const defaultTitle = () =>
  i18n.translate('xpack.isomer.materialize.unsupportedTitle', {
    defaultMessage: 'Content not available',
  });

/** A renderable explanation for a materialization result that could not be produced. */
export const createUnsupportedNode = (
  reason: string,
  { title, link }: MaterializeDescription = {},
  source?: MaterializedNodeSource
): UnsupportedNode => ({
  type: UNSUPPORTED_NODE_TYPE,
  title: title || defaultTitle(),
  reason,
  ...(link ? { link } : {}),
  ...(source ? { source } : {}),
});
