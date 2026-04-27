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

export const SELECTABLE_LIST_PROPS = {
  isVirtualized: false as const,
  textWrap: 'wrap' as const,
  bordered: true,
  showIcons: true,
};
