/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';
import { ErrorEmptyPrompt } from '../../error_empty_prompt';
import { LoadingEmptyPrompt } from '../../loading_empty_prompt';
import * as i18n from './translations';
import type { IlmPhase, PatternRollup } from '../../../../../types';
import { useIndicesCheckContext } from '../../../../../contexts/indices_check_context';
import { IndexCheckFields } from './index_check_fields';
import { IndexStatsPanel } from './index_stats_panel';
import { useDataQualityContext } from '../../../../../data_quality_context';
import { getIndexPropertiesContainerId } from './utils/get_index_properties_container_id';

export interface Props {
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  pattern: string;
  patternRollup: PatternRollup | undefined;
  sizeInBytes?: number;
}

const IndexPropertiesComponent: React.FC<Props> = ({
  docsCount,
  ilmPhase,
  indexName,
  pattern,
  patternRollup,
  sizeInBytes,
}) => {
  const { checkState } = useIndicesCheckContext();
  const { formatBytes, formatNumber } = useDataQualityContext();
  const indexCheckState = checkState[indexName];
  const isChecking = indexCheckState?.isChecking ?? false;
  const isLoadingMappings = indexCheckState?.isLoadingMappings ?? false;
  const isLoadingUnallowedValues = indexCheckState?.isLoadingUnallowedValues ?? false;
  const genericCheckError = indexCheckState?.genericError ?? null;
  const mappingsError = indexCheckState?.mappingsError ?? null;
  const unallowedValuesError = indexCheckState?.unallowedValuesError ?? null;
  const isCheckComplete = indexCheckState?.isCheckComplete ?? false;

  if (mappingsError != null) {
    return <ErrorEmptyPrompt title={i18n.ERROR_LOADING_MAPPINGS_TITLE} />;
  } else if (unallowedValuesError != null) {
    return <ErrorEmptyPrompt title={i18n.ERROR_LOADING_UNALLOWED_VALUES_TITLE} />;
  } else if (genericCheckError != null) {
    return <ErrorEmptyPrompt title={i18n.ERROR_GENERIC_CHECK_TITLE} />;
  }

  if (isLoadingMappings) {
    return <LoadingEmptyPrompt loading={i18n.LOADING_MAPPINGS} />;
  } else if (isLoadingUnallowedValues) {
    return <LoadingEmptyPrompt loading={i18n.LOADING_UNALLOWED_VALUES} />;
  } else if (isChecking) {
    return <LoadingEmptyPrompt loading={i18n.CHECKING_INDEX} />;
  }

  return isCheckComplete ? (
    <div data-index-properties-container={getIndexPropertiesContainerId({ indexName, pattern })}>
      {ilmPhase && (
        <IndexStatsPanel
          docsCount={formatNumber(docsCount)}
          sizeInBytes={formatBytes(sizeInBytes ?? 0)}
          ilmPhase={ilmPhase}
        />
      )}
      <EuiSpacer />
      <IndexCheckFields
        ilmPhase={ilmPhase}
        docsCount={docsCount}
        patternRollup={patternRollup}
        indexName={indexName}
      />
    </div>
  ) : null;
};

IndexPropertiesComponent.displayName = 'IndexPropertiesComponent';

export const IndexProperties = React.memo(IndexPropertiesComponent);
