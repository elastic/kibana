/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import { DEGRADED_DOCS_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { useDatasetDetailsTelemetry, useDatasetQualityDetailsState } from '../../hooks';
import { DataStreamNotFoundPrompt } from './index_not_found_prompt';
import { Header } from './header';
import { Overview } from './overview';
import { Details } from './details';
import { AlertFlyout } from '../../alerts/alert_flyout';

const QualityIssueFlyout = dynamic(() => import('./quality_issue_flyout'));

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function DatasetQualityDetails() {
  const { isIndexNotFoundError, dataStream, isQualityIssueFlyoutOpen, view } =
    useDatasetQualityDetailsState();
  const { startTracking } = useDatasetDetailsTelemetry();

  const [ruleType, setRuleType] = useState<typeof DEGRADED_DOCS_RULE_TYPE_ID | null>(null);

  useEffect(() => {
    startTracking();
  }, [startTracking]);
  return isIndexNotFoundError ? (
    <DataStreamNotFoundPrompt dataStream={dataStream} />
  ) : (
    <>
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="datasetDetailsContainer">
        <EuiFlexItem grow={false}>
          {view === 'dataQuality' && (
            <>
              <Header />
              <EuiHorizontalRule />
            </>
          )}
          <Overview openAlertFlyout={() => setRuleType(DEGRADED_DOCS_RULE_TYPE_ID)} />
          {view === 'dataQuality' && (
            <>
              <EuiHorizontalRule />
              <Details />
            </>
          )}
        </EuiFlexItem>
        {ruleType === DEGRADED_DOCS_RULE_TYPE_ID && (
          <AlertFlyout dataStream={dataStream} closeFlyout={() => setRuleType(null)} />
        )}
      </EuiFlexGroup>
      {isQualityIssueFlyoutOpen && <QualityIssueFlyout />}
    </>
  );
}
