/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useDatasetQualityDetailsState } from '../../../../hooks';
import {
  overviewPanelDocumentsIndicatorSize,
  overviewPanelDocumentsIndicatorTotalCount,
  overviewPanelResourcesIndicatorServices,
  overviewPanelResourcesIndicatorSize,
  overviewPanelTitleDocuments,
  overviewPanelTitleResources,
} from '../../../../../common/translations';
import { useOverviewSummaryPanel } from '../../../../hooks/use_overview_summary_panel';
import { Panel, PanelIndicator } from './panel';

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
    defaultMessage="The number of documents sent to failure store due to an issue during ingestion. Failed documents are only captured if the failure store is explicitly enabled."
  />
);

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Summary() {
  const { canShowFailureStoreInfo } = useDatasetQualityDetailsState();
  const {
    isSummaryPanelLoading,
    totalDocsCount,
    sizeInBytes,
    isUserAllowedToSeeSizeInBytes,
    totalServicesCount,
    totalHostsCount,
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
    </EuiFlexGroup>
  );
}
