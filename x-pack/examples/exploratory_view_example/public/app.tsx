/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { IndexPattern } from '@kbn/data-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { AllSeries } from '@kbn/observability-plugin/public';
import { StartDependencies } from './plugin';

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultIndexPattern: IndexPattern | null;
}) => {
  const ExploratoryViewComponent = props.plugins.observability.ExploratoryViewEmbeddable;

  const seriesList: AllSeries = [
    {
      name: 'Monitors response duration',
      time: {
        from: 'now-5d',
        to: 'now',
      },
      reportDefinitions: {
        'monitor.id': ['ALL_VALUES'],
      },
      breakdown: 'monitor.type',
      operationType: 'average',
      dataType: 'synthetics',
      seriesType: 'line',
      selectedMetricField: 'monitor.duration.us',
    },
  ];

  const hrefLink = props.plugins.observability.createExploratoryViewUrl(
    { reportType: 'kpi-over-time', allSeries: seriesList },
    props.core.http.basePath.get()
  );

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Observability Exploratory View Example</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody style={{ maxWidth: 800, margin: '0 auto', height: '70vh' }}>
            <p>
              This app embeds an Observability Exploratory view as embeddable component. Make sure
              you have data in heartbeat-* index within last 5 days for this demo to work.
            </p>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton aria-label="Open in exploratory view" href={hrefLink} target="_blank">
                  Edit in exploratory view (new tab)
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <ExploratoryViewComponent
              attributes={seriesList}
              reportType="kpi-over-time"
              title={'Monitor response duration'}
              withActions={['save', 'explore']}
            />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
