/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

export function examplePage(title: string): JSX.Element {
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>{title}</h1>
          </EuiTitle>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiText>
              <h1>sql_rule</h1>

              <p>
                Kibana alerting rule that uses SQL. with the resultant SQL columns selecting both
                the alert id (nee: alert instance id, like a host name) and context variables.
              </p>

              <h1>kb_profiler</h1>

              <p>
                HTTP endpoints in Kibana to run a CPU profile for specified duration, and obtain a
                heap snapshot.
              </p>

              <h1>worker_rule</h1>

              <p>Kibana alerting rule that runs the rule as a node Worker.</p>

              <h1>task_grapher</h1>

              <p>
                Looking for some visualizations of task activity over time, but most likely looking
                purely at alerting rules / connectors, since they have good timing info in the event
                log, but there is not really anything for task manager.
              </p>
            </EuiText>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
