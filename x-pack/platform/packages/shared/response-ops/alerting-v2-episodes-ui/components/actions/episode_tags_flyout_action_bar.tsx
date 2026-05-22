/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { useEuiTheme } from '@elastic/eui';
import * as i18n from './translations';

export type EpisodeTagsFlyoutActionBarTheme = ReturnType<typeof useEuiTheme>['euiTheme'];

export interface EpisodeTagsFlyoutActionBarProps {
  euiTheme: EpisodeTagsFlyoutActionBarTheme;
  totalTagCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

export function EpisodeTagsFlyoutActionBar({
  euiTheme,
  totalTagCount,
  selectedCount,
  onSelectAll,
  onSelectNone,
}: EpisodeTagsFlyoutActionBarProps) {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        direction="row"
        css={{ flexGrow: 0 }}
        gutterSize="none"
      >
        <EuiFlexItem
          grow={false}
          css={{
            borderRight: euiTheme.border.thin,
            paddingRight: euiTheme.size.s,
          }}
        >
          <EuiText size="xs" color="subdued">
            {i18n.getTagsActionTotalTagsLabel(totalTagCount)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={{
            paddingLeft: euiTheme.size.s,
          }}
        >
          <EuiText size="xs" color="subdued">
            {i18n.getTagsActionSelectedTagsLabel(selectedCount)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
          <EuiFlexGroup
            responsive={false}
            direction="row"
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="xs"
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="right"
                onClick={onSelectAll}
                data-test-subj="alertingEpisodeTagsFlyout-select-all"
              >
                {i18n.TAGS_ACTION_SELECT_ALL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="right"
                onClick={onSelectNone}
                data-test-subj="alertingEpisodeTagsFlyout-select-none"
              >
                {i18n.TAGS_ACTION_SELECT_NONE}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
    </>
  );
}
