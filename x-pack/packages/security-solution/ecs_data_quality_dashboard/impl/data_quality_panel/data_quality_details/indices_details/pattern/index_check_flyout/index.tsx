/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';

import { getIlmPhase } from '../../../../utils/get_ilm_phase';
import { getDocsCount, getSizeInBytes } from '../../../../utils/stats';
import { useIndicesCheckContext } from '../../../../contexts/indices_check_context';

import { EMPTY_STAT } from '../../../../constants';
import { MeteringStatsIndex, PatternRollup } from '../../../../types';
import { useDataQualityContext } from '../../../../data_quality_context';
import { IndexProperties } from './index_properties';
import { IndexResultBadge } from '../index_result_badge';
import { useCurrentWindowWidth } from './hooks/use_current_window_width';
import { CHECK_NOW, HISTORY, LATEST_CHECK } from './translations';

export interface Props {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  indexName: string;
  pattern: string;
  patternRollup: PatternRollup | undefined;
  stats: Record<string, MeteringStatsIndex> | null;
  onClose: () => void;
}

const tabs = [
  {
    id: LATEST_CHECK,
    name: LATEST_CHECK,
  },
  {
    id: HISTORY,
    name: HISTORY,
    disabled: true,
  },
];

export const IndexCheckFlyoutComponent: React.FC<Props> = ({
  ilmExplain,
  indexName,
  pattern,
  patternRollup,
  stats,
  onClose,
}) => {
  const currentWindowWidth = useCurrentWindowWidth();
  const isLargeScreen = currentWindowWidth > 1720;
  const isMediumScreen = currentWindowWidth > 1200;
  const { httpFetch, formatBytes, formatNumber, isILMAvailable } = useDataQualityContext();
  const { checkState, checkIndex } = useIndicesCheckContext();
  const indexCheckState = checkState[indexName];
  const isChecking = indexCheckState?.isChecking ?? false;
  const partitionedFieldMetadata = indexCheckState?.partitionedFieldMetadata ?? null;
  const indexResult = patternRollup?.results?.[indexName];
  const indexCheckFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'indexCheckFlyoutTitle',
  });
  const [selectedTabId, setSelectedTabId] = useState(LATEST_CHECK);
  const abortControllerRef = React.useRef(new AbortController());

  const handleCheckNow = useCallback(() => {
    checkIndex({
      abortController: abortControllerRef.current,
      indexName,
      pattern,
      httpFetch,
      formatBytes,
      formatNumber,
    });
  }, [checkIndex, formatBytes, formatNumber, httpFetch, indexName, pattern]);

  useEffect(() => {
    const abortController = abortControllerRef.current;
    return () => {
      abortController.abort();
    };
  }, []);

  const renderTabs = useMemo(
    () =>
      tabs.map((tab, index) => (
        <EuiTab
          onClick={() => setSelectedTabId(tab.id)}
          isSelected={tab.id === selectedTabId}
          key={index}
          disabled={tab.disabled}
        >
          {tab.name}
        </EuiTab>
      )),
    [selectedTabId]
  );

  return (
    <div data-test-subj="indexCheckFlyout">
      <EuiFlyout
        size={isLargeScreen ? '50%' : isMediumScreen ? '70%' : '90%'}
        ownFocus
        onClose={onClose}
        aria-labelledby={indexCheckFlyoutTitleId}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <EuiFlexGroup alignItems={'center'}>
              {partitionedFieldMetadata?.incompatible != null && (
                <IndexResultBadge incompatible={partitionedFieldMetadata.incompatible.length} />
              )}
              <h2 id={indexCheckFlyoutTitleId}>{indexName}</h2>
            </EuiFlexGroup>
          </EuiTitle>
          {indexResult != null && indexResult.checkedAt != null && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" data-test-subj="latestCheckedAt">
                {moment(indexResult.checkedAt).isValid()
                  ? moment(indexResult.checkedAt).format('MMM DD, YYYY @ HH:mm:ss.SSS')
                  : EMPTY_STAT}
              </EuiText>
            </>
          )}
          <EuiSpacer />
          <EuiTabs style={{ marginBottom: '-25px' }}>{renderTabs}</EuiTabs>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <IndexProperties
            docsCount={getDocsCount({ stats, indexName })}
            sizeInBytes={getSizeInBytes({ stats, indexName })}
            ilmPhase={
              isILMAvailable && ilmExplain != null
                ? getIlmPhase(ilmExplain?.[indexName], isILMAvailable)
                : undefined
            }
            indexName={indexName}
            pattern={pattern}
            patternRollup={patternRollup}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton iconType="refresh" isLoading={isChecking} onClick={handleCheckNow} fill>
                {CHECK_NOW}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </div>
  );
};

IndexCheckFlyoutComponent.displayName = 'IndexCheckFlyoutComponent';

export const IndexCheckFlyout = React.memo(IndexCheckFlyoutComponent);
