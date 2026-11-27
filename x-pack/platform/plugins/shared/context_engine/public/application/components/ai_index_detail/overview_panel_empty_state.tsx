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

export const OVERVIEW_PANEL_BODY_HEIGHT = 200;

// `marginTop: auto` keeps the box at the bottom of a column panel, so boxes side by side line up
// when only one panel has a description. `flexGrow: 0` stops the flex group taking that space.
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

/** Centered icon and text, as tall as a loaded panel body, for empty and error states. */
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
