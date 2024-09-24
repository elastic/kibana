/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBadge, EuiButtonGroup, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';

import {
  ALL_FIELDS,
  CUSTOM_FIELDS,
  ECS_COMPLIANT_FIELDS,
  INCOMPATIBLE_FIELDS,
  SAME_FAMILY,
} from '../../../../../../translations';
import { useIndicesCheckContext } from '../../../../../../contexts/indices_check_context';
import { IlmPhase, PatternRollup } from '../../../../../../types';
import { EMPTY_METADATA } from '../../../../../../constants';
import { INCOMPATIBLE_TAB_ID, SAME_FAMILY_TAB_ID } from '../../constants';
import { getIncompatibleStatBadgeColor } from '../../../../../../utils/get_incompatible_stat_badge_color';
import { getIncompatibleMappings, getIncompatibleValues } from '../../../../../../utils/markdown';
import { IncompatibleTab } from '../../incompatible_tab';
import { getSizeInBytes } from '../../../../../../utils/stats';
import { SameFamilyTab } from '../../same_family_tab';
import { ALL_TAB_ID, CUSTOM_TAB_ID, ECS_COMPLIANT_TAB_ID } from './constants';
import { CustomTab } from './custom_tab';
import { EcsCompliantTab } from './ecs_compliant_tab';
import { AllTab } from './all_tab';
import { getEcsCompliantBadgeColor } from './utils/get_ecs_compliant_badge_color';

const StyledTabFlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;

const StyledTabFlexItem = styled.div`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const StyledButtonGroup = styled(EuiButtonGroup)`
  button[data-test-subj='${INCOMPATIBLE_TAB_ID}'] {
    flex-grow: 1.2;
  }
  button[data-test-subj='${ECS_COMPLIANT_TAB_ID}'] {
    flex-grow: 1.4;
  }
`;

const StyledBadge = styled(EuiBadge)`
  text-align: right;
  cursor: pointer;
`;

export interface Props {
  indexName: string;
  patternRollup: PatternRollup | undefined;
  ilmPhase: IlmPhase | undefined;
  docsCount: number;
}

const LatestCheckFieldsComponent: React.FC<Props> = ({
  indexName,
  patternRollup,
  ilmPhase,
  docsCount,
}) => {
  const { checkState } = useIndicesCheckContext();
  const partitionedFieldMetadata =
    checkState[indexName]?.partitionedFieldMetadata ?? EMPTY_METADATA;

  const incompatibleFields = partitionedFieldMetadata.incompatible;
  const incompatibleFieldsCount = incompatibleFields.length;
  const incompatibleMappingsFields = getIncompatibleMappings(incompatibleFields);
  const incompatibleValuesFields = getIncompatibleValues(incompatibleFields);
  const ecsCompliantFields = partitionedFieldMetadata.ecsCompliant;
  const ecsCompliantFieldsCount = ecsCompliantFields.length;
  const customFields = partitionedFieldMetadata.custom;
  const customFieldsCount = customFields.length;
  const sameFamilyFields = partitionedFieldMetadata.sameFamily;
  const sameFamilyFieldsCount = sameFamilyFields.length;
  const allFields = partitionedFieldMetadata.all;
  const allFieldsCount = allFields.length;
  const sizeInBytes = useMemo(
    () =>
      getSizeInBytes({
        indexName,
        stats: patternRollup?.stats ?? null,
      }),
    [indexName, patternRollup?.stats]
  );
  const patternDocsCount = patternRollup?.docsCount ?? 0;

  const tabs = useMemo(
    () => [
      {
        id: INCOMPATIBLE_TAB_ID,
        name: INCOMPATIBLE_FIELDS,
        append: (
          <StyledBadge color={getIncompatibleStatBadgeColor(incompatibleFields.length)}>
            {incompatibleFields.length}
          </StyledBadge>
        ),
        content: (
          <IncompatibleTab
            docsCount={docsCount}
            ilmPhase={ilmPhase}
            indexName={indexName}
            patternDocsCount={patternDocsCount}
            incompatibleMappingsFields={incompatibleMappingsFields}
            incompatibleValuesFields={incompatibleValuesFields}
            sameFamilyFieldsCount={sameFamilyFieldsCount}
            ecsCompliantFieldsCount={ecsCompliantFieldsCount}
            customFieldsCount={customFieldsCount}
            allFieldsCount={allFieldsCount}
            sizeInBytes={sizeInBytes}
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
            patternDocsCount={patternDocsCount}
            sizeInBytes={sizeInBytes}
          />
        ),
      },
      {
        id: CUSTOM_TAB_ID,
        name: CUSTOM_FIELDS,
        append: <StyledBadge color="hollow">{customFieldsCount}</StyledBadge>,
        content: (
          <CustomTab
            docsCount={docsCount}
            ilmPhase={ilmPhase}
            indexName={indexName}
            customFields={customFields}
            incompatibleFieldsCount={incompatibleFieldsCount}
            ecsCompliantFieldsCount={ecsCompliantFieldsCount}
            sameFamilyFieldsCount={sameFamilyFieldsCount}
            allFieldsCount={allFieldsCount}
            patternDocsCount={patternDocsCount}
            sizeInBytes={sizeInBytes}
          />
        ),
      },

      {
        id: ECS_COMPLIANT_TAB_ID,
        name: ECS_COMPLIANT_FIELDS,
        append: (
          <StyledBadge color={getEcsCompliantBadgeColor(ecsCompliantFields)}>
            {ecsCompliantFieldsCount}
          </StyledBadge>
        ),
        content: <EcsCompliantTab indexName={indexName} ecsCompliantFields={ecsCompliantFields} />,
      },
      {
        id: ALL_TAB_ID,
        name: ALL_FIELDS,
        append: <StyledBadge color="hollow">{allFieldsCount}</StyledBadge>,
        content: <AllTab indexName={indexName} allFields={allFields} />,
      },
    ],
    [
      allFields,
      allFieldsCount,
      customFields,
      customFieldsCount,
      docsCount,
      ecsCompliantFields,
      ecsCompliantFieldsCount,
      ilmPhase,
      incompatibleFields.length,
      incompatibleFieldsCount,
      incompatibleMappingsFields,
      incompatibleValuesFields,
      indexName,
      patternDocsCount,
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
        isFullWidth
      />
      <EuiSpacer />
      {tabs.find((tab) => tab.id === selectedTabId)?.content}
    </div>
  );
};

LatestCheckFieldsComponent.displayName = 'LatestCheckFieldsComponent';

export const LatestCheckFields = React.memo(LatestCheckFieldsComponent);
