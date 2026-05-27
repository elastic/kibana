/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { HttpStart } from '@kbn/core/public';

const SOLUTIONS = [
  {
    label: 'Observability',
    icon: 'logoObservability',
    href: '/app/observability',
    description: 'Logs, metrics & traces',
  },
  {
    label: 'Security',
    icon: 'logoSecurity',
    href: '/app/security',
    description: 'SIEM & endpoint',
  },
  {
    label: 'Elasticsearch',
    icon: 'logoElasticsearch',
    href: '/app/elasticsearch/getting_started',
    description: 'Search & vector store',
  },
  {
    label: 'Analytics',
    icon: 'logoKibana',
    href: '/app/kibana_overview',
    description: 'Discover, Dashboards & ML',
  },
  {
    label: 'Dev Tools',
    icon: 'devToolsApp',
    href: '/app/dev_tools',
    description: 'Console, Profiler & Debugger',
  },
  {
    label: 'Management',
    icon: 'managementApp',
    href: '/app/management',
    description: 'Stack settings',
  },
] as const;

interface SolutionNavProps {
  http: HttpStart;
}

export const SolutionNav: React.FC<SolutionNavProps> = ({ http }) => {
  return (
    <EuiFlexGroup gutterSize="m">
      {SOLUTIONS.map(({ label, icon, href, description }) => (
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
            hasBorder
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
