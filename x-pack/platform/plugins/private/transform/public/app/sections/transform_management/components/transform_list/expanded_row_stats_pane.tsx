/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

import type { TransformListRow } from '../../../../common';
import { isTransformListRowWithStats } from '../../../../common/transform_list';
import { useGetTransformStats } from '../../../../hooks';

import type { SectionConfig } from './expanded_row_column_view';
import { ExpandedRowColumnView } from './expanded_row_column_view';

const STAT_LABELS: Record<string, string> = {
  pages_processed: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.pagesProcessedLabel',
    { defaultMessage: 'Pages processed' }
  ),
  documents_processed: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.documentsProcessedLabel',
    { defaultMessage: 'Documents processed' }
  ),
  documents_indexed: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.documentsIndexedLabel',
    { defaultMessage: 'Documents indexed' }
  ),
  trigger_count: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.triggerCountLabel',
    { defaultMessage: 'Trigger count' }
  ),
  index_time_in_ms: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.indexTimeLabel',
    { defaultMessage: 'Index time (ms)' }
  ),
  index_total: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.indexOperationsLabel',
    { defaultMessage: 'Index operations' }
  ),
  index_failures: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.indexFailuresLabel',
    { defaultMessage: 'Index failures' }
  ),
  search_time_in_ms: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.searchTimeLabel',
    { defaultMessage: 'Search time (ms)' }
  ),
  search_total: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.searchOperationsLabel',
    { defaultMessage: 'Search operations' }
  ),
  search_failures: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.searchFailuresLabel',
    { defaultMessage: 'Search failures' }
  ),
  processing_time_in_ms: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.processingTimeLabel',
    { defaultMessage: 'Processing time (ms)' }
  ),
  processing_total: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.processingOperationsLabel',
    { defaultMessage: 'Processing operations' }
  ),
  delete_time_in_ms: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.deleteTimeLabel',
    { defaultMessage: 'Delete time (ms)' }
  ),
  documents_deleted: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.documentsDeletedLabel',
    { defaultMessage: 'Documents deleted' }
  ),
  exponential_avg_checkpoint_duration_ms: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.exponentialAverageCheckpointDurationLabel',
    { defaultMessage: 'Exponential average checkpoint duration (ms)' }
  ),
  exponential_avg_documents_indexed: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.exponentialAverageDocumentsIndexedLabel',
    { defaultMessage: 'Exponential average documents indexed' }
  ),
  exponential_avg_documents_processed: i18n.translate(
    'xpack.transform.transformList.transformDetails.stats.exponentialAverageDocumentsProcessedLabel',
    { defaultMessage: 'Exponential average documents processed' }
  ),
};

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    flexGroup: css`
      height: ${euiTheme.size.xxxxl};
    `,
  };
};

const NoStatsFallbackTabContent = ({
  transformsStatsLoading,
}: {
  transformsStatsLoading: boolean;
}) => {
  const styles = useStyles();

  const content = transformsStatsLoading ? (
    <EuiLoadingSpinner />
  ) : (
    <EuiFlexItem grow={true}>
      <KbnWarningCallout
        announceOnMount
        size="s"
        title={
          <FormattedMessage
            id="xpack.transform.transformList.noStatsAvailable"
            defaultMessage="No stats available for this transform."
          />
        }
      />
    </EuiFlexItem>
  );
  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" css={styles.flexGroup}>
      {content}
    </EuiFlexGroup>
  );
};

function getItemDescription(value: any) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value.toString();
}

const getStatLabel = (key: string) =>
  STAT_LABELS[key] ?? `${key.charAt(0).toUpperCase()}${key.slice(1).replaceAll('_', ' ')}`;

interface ExpandedRowStatsPaneProps {
  item: TransformListRow;
}

export const ExpandedRowStatsPane: FC<ExpandedRowStatsPaneProps> = ({ item }) => {
  const { data: fullStats, isError, isLoading } = useGetTransformStats(item.id, false, true);

  if (!isTransformListRowWithStats(item) && fullStats === undefined) {
    return <NoStatsFallbackTabContent transformsStatsLoading={isLoading} />;
  }

  let displayStats = {};

  if (fullStats !== undefined && !isLoading && !isError) {
    displayStats = fullStats.transforms[0].stats;
  } else if (isTransformListRowWithStats(item)) {
    displayStats = item.stats?.stats;
  }

  const statsSection: SectionConfig = {
    title: i18n.translate('xpack.transform.transformList.transformDetails.statsTitle', {
      defaultMessage: 'Statistics',
    }),
    items: Object.entries(displayStats).map((s) => {
      return { title: getStatLabel(s[0]), description: getItemDescription(s[1]) };
    }),
    position: 'left',
  };

  return (
    <ExpandedRowColumnView
      sections={[statsSection]}
      showErrorCallout={isError}
      dataTestSubj={'transformStatsTabContent'}
    />
  );
};
