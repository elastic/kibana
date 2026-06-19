/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExperimentalBadge } from '../../components/experimental_badge';

export const WhyV2Hero = () => (
  <header data-test-subj="whyV2Hero">
    <EuiFlexGroup justifyContent="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <ExperimentalBadge />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    <div style={{ textAlign: 'center' }}>
      <EuiTitle size="l">
        <h1>
          <FormattedMessage
            id="xpack.alertingV2.whyV2.hero.title"
            defaultMessage="Why Alerting v2.0"
          />
        </h1>
    </EuiTitle>
    </div>
    <EuiSpacer size="m" />
    <EuiText textAlign="center" color="subdued" size="m">
      <p>
        <FormattedMessage
          id="xpack.alertingV2.whyV2.hero.subtitle"
          defaultMessage="Query with ES|QL. Store what matters. Route response through policies and Workflows."
        />
      </p>
    </EuiText>
  </header>
);
