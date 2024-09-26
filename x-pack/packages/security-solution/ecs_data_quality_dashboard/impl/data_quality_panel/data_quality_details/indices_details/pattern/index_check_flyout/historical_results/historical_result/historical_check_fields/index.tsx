/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBadge, EuiButtonGroup, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';

import type { HistoricalResult } from '../../../../../../../types';
import { getIncompatibleStatBadgeColor } from '../../../../../../../utils/get_incompatible_stat_badge_color';
import { INCOMPATIBLE_FIELDS, SAME_FAMILY } from '../../../../../../../translations';
import { INCOMPATIBLE_TAB_ID, SAME_FAMILY_TAB_ID } from '../../../constants';
import { getIncompatibleAndSameFamilyFieldsFromHistoricalResult } from './utils/get_incompatible_and_same_family_fields_from_historical_result';
import { IncompatibleTab } from '../../../incompatible_tab';
import { SameFamilyTab } from '../../../same_family_tab';

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

export interface Props {
  indexName: string;
  historicalResult: HistoricalResult;
}

const HistoricalCheckFieldsComponent: React.FC<Props> = ({ indexName, historicalResult }) => {
  const { incompatibleMappingsFields, incompatibleValuesFields, sameFamilyFields } =
    getIncompatibleAndSameFamilyFieldsFromHistoricalResult(historicalResult);

  const {
    docsCount,
    ilmPhase,
    sizeInBytes,
    incompatibleFieldCount: incompatibleFieldsCount,
    sameFamilyFieldCount: sameFamilyFieldsCount,
    ecsFieldCount: ecsCompliantFieldsCount,
    customFieldCount: customFieldsCount,
    totalFieldCount: allFieldsCount,
  } = historicalResult;

  const tabs = useMemo(
    () => [
      {
        id: INCOMPATIBLE_TAB_ID,
        name: INCOMPATIBLE_FIELDS,
        append: (
          <StyledBadge color={getIncompatibleStatBadgeColor(incompatibleFieldsCount)}>
            {incompatibleFieldsCount}
          </StyledBadge>
        ),
        content: (
          <IncompatibleTab
            docsCount={docsCount}
            ilmPhase={ilmPhase}
            indexName={indexName}
            incompatibleMappingsFields={incompatibleMappingsFields}
            incompatibleValuesFields={incompatibleValuesFields}
            sameFamilyFieldsCount={sameFamilyFieldsCount}
            ecsCompliantFieldsCount={ecsCompliantFieldsCount}
            customFieldsCount={customFieldsCount}
            allFieldsCount={allFieldsCount}
            sizeInBytes={sizeInBytes}
            hasStickyActions={false}
          />
        ),
      },
      {
        id: SAME_FAMILY_TAB_ID,
        name: SAME_FAMILY,
        append: <StyledBadge color="hollow">{sameFamilyFieldsCount}</StyledBadge>,
        content: (
          <SameFamilyTab
            docsCount={docsCount}
            ilmPhase={ilmPhase}
            indexName={indexName}
            sameFamilyFields={sameFamilyFields}
            incompatibleFieldsCount={incompatibleFieldsCount}
            ecsCompliantFieldsCount={ecsCompliantFieldsCount}
            customFieldsCount={customFieldsCount}
            allFieldsCount={allFieldsCount}
            sizeInBytes={sizeInBytes}
            hasStickyActions={false}
          />
        ),
      },
    ],
    [
      allFieldsCount,
      customFieldsCount,
      docsCount,
      ecsCompliantFieldsCount,
      ilmPhase,
      incompatibleFieldsCount,
      incompatibleMappingsFields,
      incompatibleValuesFields,
      indexName,
      sameFamilyFields,
      sameFamilyFieldsCount,
      sizeInBytes,
    ]
  );

  const [selectedTabId, setSelectedTabId] = useState<string>(INCOMPATIBLE_TAB_ID);

  const tabSelections = useMemo(
    () =>
      tabs.map((tab) => ({
        id: tab.id,
        label: (
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
        ),
        textProps: false as false,
      })),
    [tabs]
  );

  const handleSelectedTabId = useCallback((optionId: string) => {
    setSelectedTabId(optionId);
  }, []);

  return (
    <div data-test-subj="indexCheckFields">
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
      {tabs.find((tab) => tab.id === selectedTabId)?.content}
    </div>
  );
};

HistoricalCheckFieldsComponent.displayName = 'HistoricalCheckFieldsComponent';

export const HistoricalCheckFields = React.memo(HistoricalCheckFieldsComponent);
