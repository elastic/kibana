/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlViewsPlugin } from './plugin';

export function plugin() {
  return new EsqlViewsPlugin();
}

export type { EsqlViewsPublicStart } from './types';
export type { CreateEditEsqlViewFlyoutProps } from './create_edit_view_flyout';
