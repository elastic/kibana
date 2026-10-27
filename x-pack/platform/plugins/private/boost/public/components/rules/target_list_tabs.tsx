/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTab, EuiTabs, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../../../common/types';
import { ShowHiddenSwitch } from '../hidden_data';

/** The tab that lists every data source of the rule's type, beside its matches or selection. */
export const ALL_TARGETS_TAB_LABELS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.patternMatches.allIndicesTab', {
    defaultMessage: 'All indices',
  }),
  data_streams: i18n.translate('xpack.boost.patternMatches.allDataStreamsTab', {
    defaultMessage: 'All data streams',
  }),
};

// The height of the tabs' row, with the space above it, for lists that size themselves to fit
// under it: EUI's small tabs are 32px tall.
export const TARGET_LIST_TABS_HEIGHT = 40;

export interface TargetListTab<TabId extends string> {
  id: TabId;
  label: string;
  'data-test-subj': string;
}

interface TargetListTabsProps<TabId extends string> {
  tabs: ReadonlyArray<TargetListTab<TabId>>;
  selectedTab: TabId;
  onTabChange: (tab: TabId) => void;
  /** Each tab's id, which its panel is labelled by. */
  getTabId: (tab: TabId) => string;
  /** The id of the panel the tabs control. */
  panelId: string;
  /** Whether the tabs and the switch are off, such as until a profile is selected. */
  isDisabled: boolean;
  /** Whether the lists show hidden data sources. */
  includesHidden: boolean;
  onIncludesHiddenChange: (includesHidden: boolean) => void;
  /** Whether the switch is off while the tabs aren't, as when it would show nothing more. */
  isShowHiddenDisabled: boolean;
  /** Why the switch is off, when that isn't plain. */
  showHiddenDisabledTip?: string;
}

/**
 * The tabs atop a rule's list of targets, and the switch that shows hidden data sources at their
 * end, so the pattern's matches and the list to select from look alike.
 */
export const TargetListTabs = <TabId extends string>({
  tabs,
  selectedTab,
  onTabChange,
  getTabId,
  panelId,
  isDisabled,
  includesHidden,
  onIncludesHiddenChange,
  isShowHiddenDisabled,
  showHiddenDisabledTip,
}: TargetListTabsProps<TabId>) => {
  const { euiTheme } = useEuiTheme();
  const isSwitchDisabled = isDisabled || isShowHiddenDisabled;
  const showHiddenSwitch = (
    <ShowHiddenSwitch
      checked={includesHidden}
      onChange={onIncludesHiddenChange}
      disabled={isSwitchDisabled}
      labelSize="xs"
      data-test-subj="boostRuleShowHidden"
    />
  );

  return (
    // The row draws the tabs' border, as the tabs do, so it runs under the switch too. A margin
    // rather than padding, so the border stops at the panel's padding.
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: euiTheme.size.m,
        margin: `${euiTheme.size.s} ${euiTheme.size.base} 0`,
        boxShadow: `inset 0 -${euiTheme.border.width.thin} 0 ${euiTheme.border.color}`,
      }}
    >
      <EuiTabs size="s" bottomBorder={false}>
        {tabs.map(({ id, label, 'data-test-subj': dataTestSubj }) => (
          <EuiTab
            key={id}
            id={getTabId(id)}
            aria-controls={panelId}
            isSelected={selectedTab === id}
            disabled={isDisabled}
            onClick={() => onTabChange(id)}
            data-test-subj={dataTestSubj}
          >
            {label}
          </EuiTab>
        ))}
      </EuiTabs>
      {isSwitchDisabled && showHiddenDisabledTip && !isDisabled ? (
        <EuiToolTip content={showHiddenDisabledTip}>{showHiddenSwitch}</EuiToolTip>
      ) : (
        showHiddenSwitch
      )}
    </div>
  );
};

interface TargetListMessageProps {
  message: string;
  'data-test-subj'?: string;
}

/** What a list of targets says in place of its targets, such as when there are none. */
export const TargetListMessage = ({
  message,
  'data-test-subj': dataTestSubj,
}: TargetListMessageProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      size="s"
      color={euiTheme.colors.textDisabled}
      textAlign="center"
      // 24px from the tabs and the panel's bottom edge, after the space around the tab's content.
      css={{ paddingBlock: euiTheme.size.base }}
      data-test-subj={dataTestSubj}
    >
      <p>{message}</p>
    </EuiText>
  );
};
