/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ICONS } from '../../icons';
import type { Lane } from './activity_helpers';
import type { SortOrder } from './use_response_log';
import * as i18n from './translations';

export interface TimelineToolbarProps {
  lane: Lane;
  onLaneChange: (lane: Lane) => void;
  allCount: number;
  securityCount: number;
  responseCount: number;
  searchText: string;
  onSearchChange: (text: string) => void;
  order: SortOrder;
  onOrderChange: (order: SortOrder) => void;
  onJump: () => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  lane,
  onLaneChange,
  allCount,
  securityCount,
  responseCount,
  searchText,
  onSearchChange,
  order,
  onOrderChange,
  onJump,
}) => {
  const laneOptions: Array<{ id: Lane; label: string }> = [
    { id: 'all', label: i18n.LANE_ALL(allCount) },
    { id: 'security', label: i18n.LANE_SECURITY(securityCount) },
    { id: 'response', label: i18n.LANE_RESPONSE(responseCount) },
  ];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={i18n.LANE_LABEL}
          buttonSize="s"
          options={laneOptions.map((option) => ({
            id: `investigationLane-${option.id}`,
            label: option.label,
            'data-test-subj': `investigationLane-${option.id}`,
          }))}
          idSelected={`investigationLane-${lane}`}
          onChange={(id) =>
            onLaneChange(
              laneOptions.find((option) => `investigationLane-${option.id}` === id)?.id ?? 'all'
            )
          }
        />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          min-width: 180px;
        `}
      >
        <EuiFieldSearch
          compressed
          fullWidth
          isClearable
          placeholder={i18n.SEARCH_PLACEHOLDER}
          aria-label={i18n.SEARCH_PLACEHOLDER}
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          data-test-subj="investigationTimelineSearch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={i18n.ORDER_LABEL}
          buttonSize="s"
          options={[
            {
              id: 'investigationOrder-asc',
              label: i18n.ORDER_OLDEST,
              'data-test-subj': 'investigationOrderAsc',
            },
            {
              id: 'investigationOrder-desc',
              label: i18n.ORDER_NEWEST,
              'data-test-subj': 'investigationOrderDesc',
            },
          ]}
          idSelected={`investigationOrder-${order}`}
          onChange={(id) => onOrderChange(id.endsWith('desc') ? 'desc' : 'asc')}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType={order === 'asc' ? ICONS.sortDescending : ICONS.sortAscending}
          onClick={onJump}
          data-test-subj="investigationTimelineJump"
        >
          {order === 'asc' ? i18n.JUMP_LATEST : i18n.JUMP_FIRST}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
TimelineToolbar.displayName = 'TimelineToolbar';
