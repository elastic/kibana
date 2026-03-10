/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JSX } from 'react';
import type { EuiContextMenuPanelId } from '@elastic/eui/src/components/context_menu/context_menu';

interface PanelConfig {
  id: EuiContextMenuPanelId;
  title?: JSX.Element | string;
  'data-test-subj'?: string;
}

export interface RenderContentPanelProps {
  alertItems: unknown[];
  setIsBulkActionsLoading: (isLoading: boolean) => void;
  isAllSelected?: boolean;
  clearSelection?: () => void;
  refresh?: () => void;
  closePopoverMenu: () => void;
}

export interface ContentPanelConfig extends PanelConfig {
  renderContent: (args: RenderContentPanelProps) => JSX.Element;
  items?: never;
}
