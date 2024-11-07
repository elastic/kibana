/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiButtonGroupProps,
  EuiFlexGroup,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import styled, { StyledComponent } from 'styled-components';

import { CheckFieldsTab, CheckFieldsTabId } from './types';

const StyledTabFlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;

const StyledTabFlexItem = styled.div`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const StyledBadge = styled(EuiBadge)`
  text-align: right;
  cursor: pointer;
`;

interface CheckFieldsSingleButtonGroupProps {
  onChange: (id: string) => void;
  idSelected: CheckFieldsTabId;
  options: EuiButtonGroupProps['options'];
  legend: 'Check fields tab group';
  buttonSize: 'compressed';
  color: 'primary';
}

export interface Props {
  tabs: CheckFieldsTab[];
  renderButtonGroup: (
    props: CheckFieldsSingleButtonGroupProps
  ) => React.ReactElement<
    EuiButtonGroupProps,
    StyledComponent<typeof EuiButtonGroup, {}, {}, never> | typeof EuiButtonGroup
  >;
}

const CheckFieldsTabsComponent: React.FC<Props> = ({ tabs, renderButtonGroup }) => {
  const checkFieldsTabs = useMemo(
    () =>
      tabs.map((tab) => ({
        id: tab.id,
        name: tab.name,
        append: <StyledBadge color={tab.badgeColor ?? 'hollow'}>{tab.badgeCount ?? 0}</StyledBadge>,
        content: tab.content ?? null,
        disabled: Boolean(tab.disabled),
        ...(tab.disabled && { disabledReason: tab.disabledReason }),
      })),
    [tabs]
  );

  const [selectedTabId, setSelectedTabId] = useState<CheckFieldsTabId>(() => checkFieldsTabs[0].id);

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
          label = (
            <EuiToolTip
              anchorProps={{ 'data-test-subj': 'disabledReasonTooltip' }}
              content={tab.disabledReason}
            >
              {label}
            </EuiToolTip>
          );
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
    setSelectedTabId(optionId as CheckFieldsTabId);
  }, []);

  return (
    <div data-test-subj="checkFieldsTabs">
      {renderButtonGroup({
        legend: 'Check fields tab group',
        options: tabSelections,
        idSelected: selectedTabId,
        onChange: handleSelectedTabId,
        buttonSize: 'compressed',
        color: 'primary',
      })}
      <EuiSpacer />
      {checkFieldsTabs.find((tab) => tab.id === selectedTabId)?.content}
    </div>
  );
};

CheckFieldsTabsComponent.displayName = 'CheckFieldsComponent';

export const CheckFieldsTabs = React.memo(CheckFieldsTabsComponent);
