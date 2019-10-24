/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useEffect, useMemo } from 'react';
import { EuiSideNav, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InfraMetricData } from '../../../public/graphql/types';
import { Section } from '../../../public/pages/metrics/components/section';
import { SubSection } from '../../../public/pages/metrics/components/sub_section';
import { NavItem, SideNavContext } from '../../../public/pages/metrics/lib/side_nav_context';

interface VisSectionProps {
  metric?: InfraMetricData;
}

const VisSection: FunctionComponent<VisSectionProps> = ({ metric }) => {
  if (metric) {
    return (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: 250,
          backgroundColor: '#CCC',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center', flex: '1 0 auto' }}>VISUALIZATION GOES HERE</div>
      </div>
    );
  }
  return <div>Gauges without Metric (you should never see this)</div>;
};

interface WithMetricsDataProps {
  source: string;
  ids: string[];
  children: (props: LayoutProps) => React.ReactElement;
}

const WithMetricsData = ({ ids, children }: WithMetricsDataProps) => {
  if (!children) {
    return null;
  }

  // eslint-disable-next-line no-console
  useEffect(() => console.log('Fetching', ids), [ids]);

  const metrics = useMemo(() => {
    return ids.map(m => ({ id: m, series: [] }));
  }, [ids]) as InfraMetricData[];

  return children({ metrics });
};

interface LayoutProps {
  metrics: InfraMetricData[];
}

interface MetricsLayout {
  requiredMetrics: string[];
  Layout: FunctionComponent<LayoutProps>;
}

const Aws: MetricsLayout = {
  requiredMetrics: ['awsOverview', 'awsCpuUsage'],
  Layout: ({ metrics }) => (
    <Section navLabel="AWS" sectionLabel="AWS Overview" metrics={metrics}>
      <SubSection id="awsOverview">
        <VisSection />
      </SubSection>
      <SubSection id="awsCpuUtilization" label="CPU Usage">
        <VisSection />
      </SubSection>
    </Section>
  ),
};
const Nginx: MetricsLayout = {
  requiredMetrics: ['nginxOverview'],
  Layout: ({ metrics }) => (
    <Section sectionLabel="Nginx Overview" navLabel="Nginx" metrics={metrics}>
      <SubSection id="nginxHits">
        <VisSection />
      </SubSection>
    </Section>
  ),
};

export const Host: MetricsLayout = {
  requiredMetrics: [
    'hostSystemOverview',
    'hostSystemCPU',
    ...Aws.requiredMetrics,
    ...Nginx.requiredMetrics,
  ],
  Layout: ({ metrics }) => (
    <React.Fragment>
      <Section navLabel="Host" sectionLabel="Host Overview" metrics={metrics}>
        <SubSection id="hostSystemOverview">
          <VisSection />
        </SubSection>
        <SubSection id="hostCpuUsage" label="CPU Usage">
          <VisSection />
        </SubSection>
      </Section>
      <Aws.Layout metrics={metrics} />
      <Nginx.Layout metrics={metrics} />
    </React.Fragment>
  ),
};

export const DetailPage: FunctionComponent = () => {
  const [sideNav, setSideNav] = React.useState<NavItem[]>([]);

  const addNavItem = React.useCallback(
    (item: NavItem) => {
      if (!sideNav.some(n => n.id === item.id)) {
        setSideNav([item, ...sideNav]);
      }
    },
    [sideNav]
  );

  return (
    <div style={{ padding: 16, width: '100%' }}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiSideNav items={sideNav} />
        </EuiFlexItem>
        <EuiFlexItem>
          <SideNavContext.Provider value={{ items: sideNav, addNavItem }}>
            <WithMetricsData source="default" ids={Aws.requiredMetrics}>
              {({ metrics }) => <Aws.Layout metrics={metrics} />}
            </WithMetricsData>
          </SideNavContext.Provider>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
