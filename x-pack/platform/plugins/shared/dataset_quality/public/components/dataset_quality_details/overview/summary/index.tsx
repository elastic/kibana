/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
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

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Summary() {
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
