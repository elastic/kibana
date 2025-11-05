/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSpacer, EuiCard, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SERVICES_TITLE, LEARN_MORE } from './translations';

export const ServiceCards: React.FC = () => {
  return (
    <>
      <EuiTitle size="m">
        <h2>{SERVICES_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiCard
        hasBorder
        layout="horizontal"
        title="AutoOps"
        description="Get instant cluster diagnostics, performance tips, and cost-saving recommendations—no extra management needed."
        titleSize="xs"
      />
      <EuiSpacer size="m" />

      <EuiCard
        hasBorder
        layout="horizontal"
        title="Elastic Inference Service"
        description="Tap into AI-powered search and chat—no ML model deployment or management needed. Fast, scalable, and hassle-free intelligent features."
        titleSize="xs"
      />
      <EuiSpacer size="m" />

      <EuiCard
        hasBorder
        layout="horizontal"
        title="Synthetic"
        description="Proactive, automated monitoring for apps and APIs—catch issues early, get deep diagnostics, and integrate easily."
        titleSize="xs"
        betaBadgeProps={{
          label: 'COMING SOON',
        }}
      />
      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="popout" iconSide="right">
            {LEARN_MORE}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
