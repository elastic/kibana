/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { AiIndexDetailPanelEmptyState } from './ai_index_detail_panel_empty_prompt';

/** Body height of the Overview panels that sit side by side (Recent documents and the chart). */
export const OVERVIEW_PANEL_BODY_HEIGHT = 200;

// In a column panel, `marginTop: auto` keeps the box at the bottom, so the empty states of panels
// side by side line up even when only one panel has a description. `flexGrow: 0` stops the
// flex group from taking the free space instead.
// `minHeight`, so a long text (or a long translation) makes the box taller instead of overflowing.
const emptyStateBoxStyle = css({
  minHeight: OVERVIEW_PANEL_BODY_HEIGHT,
  marginTop: 'auto',
  flexGrow: 0,
});

interface OverviewPanelEmptyStateProps {
  iconType: IconType;
  dataTestSubj: string;
  message: string;
}

/**
 * Centered icon and text with the height of a loaded panel body, so the panel keeps its size.
 * Used for empty and error states.
 */
export const OverviewPanelEmptyState = ({
  iconType,
  dataTestSubj,
  message,
}: OverviewPanelEmptyStateProps) => (
  <EuiFlexGroup
    css={emptyStateBoxStyle}
    alignItems="center"
    justifyContent="center"
    responsive={false}
  >
    <EuiFlexItem grow={false}>
      <AiIndexDetailPanelEmptyState
        iconType={iconType}
        dataTestSubj={dataTestSubj}
        message={message}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
