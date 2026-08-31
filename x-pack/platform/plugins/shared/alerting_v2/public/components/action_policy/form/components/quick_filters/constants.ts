/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';

export interface QuickFiltersProps {
  matcher: PolicyMatcher | null;
  onChange: (matcher: PolicyMatcher | null) => void;
}

export const POPOVER_PANEL_STYLE = { maxWidth: 360 };

export const SELECTABLE_LIST_PROPS = {
  isVirtualized: false as const,
  textWrap: 'wrap' as const,
  bordered: true,
  showIcons: true,
};
