/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBadge, EuiButtonGroup, EuiFlexGroup, EuiSpacer, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';

import { INCOMPATIBLE_TAB_ID, SAME_FAMILY_TAB_ID } from '../../../../constants';

const StyledTabFlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;

const StyledTabFlexItem = styled.div`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const StyledButtonGroup = styled(EuiButtonGroup)`
  min-width: 50%;
  button[data-test-subj='${INCOMPATIBLE_TAB_ID}'] {
    flex-grow: 1;
  }
  button[data-test-subj='${SAME_FAMILY_TAB_ID}'] {
    flex-grow: 1;
  }
`;

const StyledBadge = styled(EuiBadge)`
  text-align: right;
  cursor: pointer;
`;

interface HistoricalCheckFieldsTab {
  id: string;
  name: string;
  badgeColor: string;
  badgeCount: number;
  content?: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
}

export interface Props {
  tabs: HistoricalCheckFieldsTab[];
}

const HistoricalCheckFieldsTabsComponent: React.FC<Props> = ({ tabs }) => {
  const checkFieldsTabs = useMemo(
    () =>
      tabs.map((tab) => ({
        id: tab.id,
        name: tab.name,
        append: <StyledBadge color={tab.badgeColor}>{tab.badgeCount}</StyledBadge>,
        content: tab.content,
        disabled: tab.disabled,
        ...(tab.disabled && { disabledReason: tab.disabledReason }),
      })),
    [tabs]
  );

  const [selectedTabId, setSelectedTabId] = useState<string>(INCOMPATIBLE_TAB_ID);

  const tabSelections = useMemo(
    () =>
      checkFieldsTabs.map((tab) => {
        let label = (
          <StyledTabFlexGroup
            responsive={false}
            justifyContent="center"
            gutterSize="s"
            alignItems="center"
            title={tab.name}
          >
            <StyledTabFlexItem>{tab.name}</StyledTabFlexItem>
            {tab.append}
          </StyledTabFlexGroup>
        );

        if (tab.disabled && tab.disabledReason) {
          label = <EuiToolTip content={tab.disabledReason}>{label}</EuiToolTip>;
        }

        return {
          id: tab.id,
          label,
          textProps: false as false,
          disabled: tab.disabled,
        };
      }),
    [checkFieldsTabs]
  );

  const handleSelectedTabId = useCallback((optionId: string) => {
    setSelectedTabId(optionId);
  }, []);

  return (
    <div data-test-subj="historicalCheckFields">
      <StyledButtonGroup
        legend="Index check field tab toggle"
        options={tabSelections}
        idSelected={selectedTabId}
        onChange={handleSelectedTabId}
        buttonSize="compressed"
        color="primary"
        isFullWidth={false}
      />
      <EuiSpacer />
      {checkFieldsTabs.find((tab) => tab.id === selectedTabId)?.content}
    </div>
  );
};

HistoricalCheckFieldsTabsComponent.displayName = 'HistoricalCheckFieldsComponent';

export const HistoricalCheckFieldsTabs = React.memo(HistoricalCheckFieldsTabsComponent);
