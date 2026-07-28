/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface QuickFiltersProps {
  matcher: string;
  onChange: (matcher: string) => void;
}

export const POPOVER_PANEL_STYLE = { maxWidth: 360 };

/**
 * KQL filter for general rule-listing queries. Action policies only target
 * alert-kind rules, so rule-listing quick filters use this to restrict results
 * to alert-kind rules. Not used for the typed rule-tag endpoint (which accepts
 * `kind: 'alert'` directly).
 */
export const ALERT_KIND_RULE_LIST_FILTER = 'kind:alert';

export const SELECTABLE_LIST_PROPS = {
  isVirtualized: false as const,
  textWrap: 'wrap' as const,
  bordered: true,
  showIcons: true,
};
