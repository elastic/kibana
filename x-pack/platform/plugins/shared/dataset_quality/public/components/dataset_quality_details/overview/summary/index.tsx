/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import {
  overviewPanelDatasetQualityIndicatorDegradedDocs,
  overviewPanelDatasetQualityIndicatorFailedDocs,
  overviewPanelDocumentsIndicatorSize,
  overviewPanelDocumentsIndicatorTotalCount,
  overviewPanelResourcesIndicatorServices,
  overviewPanelResourcesIndicatorSize,
  overviewPanelTitleDatasetQuality,
  overviewPanelTitleDocuments,
  overviewPanelTitleResources,
} from '../../../../../common/translations';
import { useOverviewSummaryPanel } from '../../../../hooks/use_overview_summary_panel';
import { DatasetQualityIndicator } from '../../../quality_indicator';
import { Panel, PanelIndicator } from './panel';
import { useDatasetQualityDetailsContext } from '../../context';

const degradedDocsTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.details.degradedDocsTooltip"
    defaultMessage="The number of degraded documents —documents with the {ignoredProperty} property— in your data set."
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
    }}
  />
);

const failedDocsColumnTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.failedDocsSummaryTooltip"
    defaultMessage="The number of documents sent to failure store due to an issue during ingestion."
  />
);

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Summary() {
  const { isFailureStoreEnabled } = useDatasetQualityDetailsContext();
  const {
    isSummaryPanelLoading,
    totalDocsCount,
    sizeInBytes,
    isUserAllowedToSeeSizeInBytes,
    totalServicesCount,
    totalHostsCount,
    totalDegradedDocsCount,
    totalFailedDocsCount,
    quality,
  } = useOverviewSummaryPanel();
  return (
    <EuiFlexGroup gutterSize="m">
      <Panel title={overviewPanelTitleDocuments}>
        <PanelIndicator
          label={overviewPanelDocumentsIndicatorTotalCount}
          value={totalDocsCount}
          isLoading={isSummaryPanelLoading}
        />
        <PanelIndicator
          label={overviewPanelDocumentsIndicatorSize}
          value={sizeInBytes}
          isLoading={isSummaryPanelLoading}
          userHasPrivilege={isUserAllowedToSeeSizeInBytes}
        />
      </Panel>
      <Panel title={overviewPanelTitleResources}>
        <PanelIndicator
          label={overviewPanelResourcesIndicatorServices}
          value={totalServicesCount}
          isLoading={isSummaryPanelLoading}
        />
        <PanelIndicator
          label={overviewPanelResourcesIndicatorSize}
          value={totalHostsCount}
          isLoading={isSummaryPanelLoading}
        />
      </Panel>
      <Panel
        title={overviewPanelTitleDatasetQuality}
        secondaryTitle={
          <DatasetQualityIndicator
            isLoading={isSummaryPanelLoading}
            quality={quality}
            textSize="xs"
          />
        }
      >
        <PanelIndicator
          label={overviewPanelDatasetQualityIndicatorDegradedDocs}
          value={totalDegradedDocsCount}
          isLoading={isSummaryPanelLoading}
          tooltip={degradedDocsTooltip}
        />
        {isFailureStoreEnabled && (
          <PanelIndicator
            label={overviewPanelDatasetQualityIndicatorFailedDocs}
            value={totalFailedDocsCount}
            isLoading={isSummaryPanelLoading}
            tooltip={failedDocsColumnTooltip}
          />
        )}
      </Panel>
    </EuiFlexGroup>
  );
}
