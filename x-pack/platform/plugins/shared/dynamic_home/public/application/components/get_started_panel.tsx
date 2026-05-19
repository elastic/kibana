/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { HttpStart } from '@kbn/core/public';

interface GetStartedPanelProps {
  http: HttpStart;
}

const ACTIONS = [
  {
    label: 'Add integrations',
    icon: 'integration',
    href: '/app/integrations',
    description: 'Connect your data sources with pre-built integrations',
  },
  {
    label: 'Try sample data',
    icon: 'beaker',
    href: '/app/home#/tutorial_directory',
    description: 'Explore Kibana with ready-made sample datasets',
  },
  {
    label: 'Upload a file',
    icon: 'importAction',
    href: '/app/ml/filedatavisualizer',
    description: 'Drag and drop a CSV, JSON, or log file',
  },
  {
    label: 'Connect to Cloud',
    icon: 'cloudStorageGlyph',
    href: '/app/management/data',
    description: 'Link your Elastic Cloud deployment',
  },
] as const;

export const GetStartedPanel: React.FC<GetStartedPanelProps> = ({ http }) => {
  return (
    <EuiPanel color="subdued" paddingSize="l" hasBorder>
      <EuiTitle size="s">
        <h2>Add your data to get started</h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>This space has no dashboards or saved searches yet. Pick a way to bring in your data.</p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="m">
        {ACTIONS.map(({ label, icon, href, description }) => (
          <EuiFlexItem key={label}>
            <EuiCard
              icon={<EuiIcon type={icon} size="xl" color="primary" />}
              title={label}
              titleSize="xs"
              description={description}
              href={http.basePath.prepend(href)}
              target="_self"
              paddingSize="m"
              textAlign="center"
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
