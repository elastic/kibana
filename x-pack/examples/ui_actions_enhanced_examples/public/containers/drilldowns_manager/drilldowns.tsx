/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { Section } from '../../components/section/section';

export const DrilldownsManager: React.FC = () => {
  return (
    <Section title={'Drilldowns Manager'}>
      <EuiText>
        <p>
          <em>Drilldown Manager</em> can be integrated into any app in Kibana. Click the button
          below to open the drilldown manager and see how works in this example plugin.
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={() => window.alert('Button clicked')}>
            Open Drilldown Manager
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Section>
  );
};
