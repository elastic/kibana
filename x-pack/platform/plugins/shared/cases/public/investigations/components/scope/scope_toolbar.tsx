/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { ICONS } from '../../icons';
import type { LayoutMode, ScopeFilters, ScopeView } from './scope_helpers';
import * as i18n from './translations';

export interface ScopeToolbarProps {
  view: ScopeView;
  onViewChange: (view: ScopeView) => void;
  filters: ScopeFilters;
  onFiltersChange: (filters: ScopeFilters) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  inScopeCount: number;
  suspectedCount: number;
  canAddLink: boolean;
  hasSavedPositions: boolean;
  onFitView: () => void;
  onResetLayout: () => void;
  onAddEntity: () => void;
  onAddLink: () => void;
}

const FILTER_IDS = {
  external: 'investigationScopeFilter-external',
  suspected: 'investigationScopeFilter-suspected',
  dismissed: 'investigationScopeFilter-dismissed',
} as const;

export const ScopeToolbar: React.FC<ScopeToolbarProps> = ({
  view,
  onViewChange,
  filters,
  onFiltersChange,
  layoutMode,
  onLayoutModeChange,
  inScopeCount,
  suspectedCount,
  canAddLink,
  hasSavedPositions,
  onFitView,
  onResetLayout,
  onAddEntity,
  onAddLink,
}) => (
  <EuiFlexGroup gutterSize="m" alignItems="center" wrap responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiButtonGroup
        legend={i18n.VIEW_LABEL}
        buttonSize="s"
        options={[
          {
            id: 'investigationScopeView-graph',
            label: i18n.VIEW_GRAPH,
            iconType: ICONS.scope,
            'data-test-subj': 'investigationScopeViewGraph',
          },
          {
            id: 'investigationScopeView-list',
            label: i18n.VIEW_LIST,
            iconType: ICONS.evidence,
            'data-test-subj': 'investigationScopeViewList',
          },
        ]}
        idSelected={`investigationScopeView-${view}`}
        onChange={(id) => onViewChange(id === 'investigationScopeView-list' ? 'list' : 'graph')}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonGroup
        type="multi"
        legend={i18n.FILTERS_LABEL}
        buttonSize="s"
        options={[
          {
            id: FILTER_IDS.external,
            label: i18n.SHOW_EXTERNAL,
            'data-test-subj': 'investigationScopeToggleExternal',
          },
          {
            id: FILTER_IDS.suspected,
            label: i18n.SHOW_SUSPECTED,
            'data-test-subj': 'investigationScopeToggleSuspected',
          },
          {
            id: FILTER_IDS.dismissed,
            label: i18n.SHOW_DISMISSED,
            'data-test-subj': 'investigationScopeToggleDismissed',
          },
        ]}
        idToSelectedMap={{
          [FILTER_IDS.external]: filters.showExternal,
          [FILTER_IDS.suspected]: filters.showSuspected,
          [FILTER_IDS.dismissed]: filters.showDismissed,
        }}
        onChange={(id) =>
          onFiltersChange({
            showExternal: id === FILTER_IDS.external ? !filters.showExternal : filters.showExternal,
            showSuspected:
              id === FILTER_IDS.suspected ? !filters.showSuspected : filters.showSuspected,
            showDismissed:
              id === FILTER_IDS.dismissed ? !filters.showDismissed : filters.showDismissed,
          })
        }
      />
    </EuiFlexItem>
    {view === 'graph' ? (
      <>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.LAYOUT_LABEL}
            buttonSize="s"
            options={[
              {
                id: 'investigationScopeLayout-saved',
                label: i18n.LAYOUT_SAVED,
                'data-test-subj': 'investigationScopeLayoutSaved',
              },
              {
                id: 'investigationScopeLayout-type',
                label: i18n.LAYOUT_BY_TYPE,
                'data-test-subj': 'investigationScopeLayoutType',
              },
            ]}
            idSelected={`investigationScopeLayout-${layoutMode}`}
            onChange={(id) => onLayoutModeChange(id.endsWith('type') ? 'type' : 'saved')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType={ICONS.scope}
            onClick={onFitView}
            data-test-subj="investigationScopeFitView"
          >
            {i18n.FIT_VIEW}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={layoutMode === 'type' ? i18n.LAYOUT_BY_TYPE_HINT : undefined}>
            <EuiButtonEmpty
              size="s"
              iconType={ICONS.refresh}
              onClick={onResetLayout}
              isDisabled={!hasSavedPositions}
              data-test-subj="investigationScopeResetLayout"
            >
              {i18n.RESET_LAYOUT}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>
      </>
    ) : null}
    <EuiFlexItem grow>
      <EuiText size="s" color="subdued" data-test-subj="investigationScopeCounts">
        {i18n.COUNTS(inScopeCount, suspectedCount)}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton
        size="s"
        iconType={ICONS.add}
        onClick={onAddEntity}
        data-test-subj="investigationScopeAddEntity"
      >
        {i18n.ADD_ENTITY}
      </EuiButton>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton
        size="s"
        iconType={ICONS.link}
        onClick={onAddLink}
        isDisabled={!canAddLink}
        data-test-subj="investigationScopeAddLink"
      >
        {i18n.ADD_LINK}
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
ScopeToolbar.displayName = 'ScopeToolbar';
