/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';

import { EMPTY_METADATA } from '../../../../../../constants';
import { useDataQualityContext } from '../../../../../../data_quality_context';
import { useIndicesCheckContext } from '../../../../../../contexts/indices_check_context';
import { INCOMPATIBLE_TAB_ID } from './constants';
import { IlmPhase, PatternRollup } from '../../../../../../types';
import { getTabs } from './tabs/helpers';

const StyledTabFlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;

const StyledTabFlexItem = styled.div`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const StyledButtonGroup = styled(EuiButtonGroup)`
  button[data-test-subj='incompatibleTab'] {
    flex-grow: 1.2;
  }
  button[data-test-subj='ecsCompliantTab'] {
    flex-grow: 1.4;
  }
`;

export interface Props {
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  patternRollup: PatternRollup | undefined;
}

const IndexCheckFieldsComponent: React.FC<Props> = ({
  indexName,
  ilmPhase,
  patternRollup,
  docsCount,
}) => {
  const { formatBytes, formatNumber } = useDataQualityContext();
  const { checkState } = useIndicesCheckContext();
  const partitionedFieldMetadata = checkState[indexName]?.partitionedFieldMetadata ?? null;

  const [selectedTabId, setSelectedTabId] = useState<string>(INCOMPATIBLE_TAB_ID);

  const tabs = useMemo(
    () =>
      getTabs({
        formatBytes,
        formatNumber,
        docsCount,
        ilmPhase,
        indexName,
        partitionedFieldMetadata: partitionedFieldMetadata ?? EMPTY_METADATA,
        patternDocsCount: patternRollup?.docsCount ?? 0,
        stats: patternRollup?.stats ?? null,
      }),
    [
      formatBytes,
      formatNumber,
      docsCount,
      ilmPhase,
      indexName,
      partitionedFieldMetadata,
      patternRollup?.docsCount,
      patternRollup?.stats,
    ]
  );

  const tabSelections = tabs.map((tab) => ({
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
  }));

  const handleSelectedTabId = (optionId: string) => {
    setSelectedTabId(optionId);
  };

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

IndexCheckFieldsComponent.displayName = 'IndexFieldsComponent';

export const IndexCheckFields = React.memo(IndexCheckFieldsComponent);
