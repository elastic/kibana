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
import { IndexPattern } from 'src/plugins/data/public';
import { CoreStart } from 'kibana/public';
import { StartDependencies } from './plugin';
import { AllSeries } from '../../../plugins/observability/public';

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultIndexPattern: IndexPattern | null;
}) => {
  const ExploratoryViewComponent = props.plugins.observability.ExploratoryViewEmbeddable;

  const exploratoryViewAttributes: AllSeries = {
    [`monitor-duration`]: {
      reportType: 'kpi-over-time',
      time: {
        from: 'now-5d',
        to: 'now',
      },
      reportDefinitions: {
        'monitor.id': ['always-down'],
      },
      breakdown: 'observer.geo.name',
      operationType: 'average',
      dataType: 'synthetics',
    },
  };

  const hrefLink = props.plugins.observability.createExploratoryViewUrl(
    exploratoryViewAttributes,
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
              This app embeds a Observability Exploratory view as embeddable component. Make sure
              you have data in heartbeat-* index for this demo to work
            </p>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton aria-label="Open in exploratory view" href={hrefLink} target="_blank">
                  Edit in exploratory view (new tab)
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <ExploratoryViewComponent
              attributes={exploratoryViewAttributes}
              title={'Monitor response duration'}
            />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
