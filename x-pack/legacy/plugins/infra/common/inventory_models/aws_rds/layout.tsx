/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayoutPropsWithTheme } from '../../../public/pages/metrics/types';
import { Section } from '../../../public/pages/metrics/components/section';
import { SubSection } from '../../../public/pages/metrics/components/sub_section';
import { ChartSectionVis } from '../../../public/pages/metrics/components/chart_section_vis';
import { withTheme } from '../../../../../common/eui_styled_components';

export const Layout = withTheme(({ metrics, theme }: LayoutPropsWithTheme) => (
  <React.Fragment>
    <Section
      navLabel="AWS RDS"
      sectionLabel={i18n.translate(
        'xpack.infra.metricDetailPage.rdsMetricsLayout.overviewSection.sectionLabel',
        {
          defaultMessage: 'Aws RDS Overview',
        }
      )}
      metrics={metrics}
    >
      <SubSection
        id="awsRDSCpuTotal"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.rdsMetricsLayout.cpuTotal.sectionLabel',
          {
            defaultMessage: 'Total CPU Usage',
          }
        )}
      >
        <ChartSectionVis
          type="area"
          formatter="percent"
          seriesOverrides={{
            cpu: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.rdsMetricsLayout.cpuTotal.chartLabel',
                { defaultMessage: 'Total' }
              ),
            },
          }}
        />
      </SubSection>
      <SubSection
        id="awsRDSConnections"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.rdsMetricsLayout.connections.sectionLabel',
          {
            defaultMessage: 'Connections',
          }
        )}
      >
        <ChartSectionVis
          type="bar"
          formatter="number"
          seriesOverrides={{
            connections: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.rdsMetricsLayout.connections.chartLabel',
                { defaultMessage: 'Connections' }
              ),
            },
          }}
        />
      </SubSection>
      <SubSection
        id="awsRDSQueriesExecuted"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.rdsMetricsLayout.queriesExecuted.sectionLabel',
          {
            defaultMessage: 'Queries Executed',
          }
        )}
      >
        <ChartSectionVis
          type="bar"
          formatter="number"
          seriesOverrides={{
            queries: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.rdsMetricsLayout.queriesExecuted.chartLabel',
                { defaultMessage: 'Queries' }
              ),
            },
          }}
        />
      </SubSection>
      <SubSection
        id="awsRDSActiveTransactions"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.rdsMetricsLayout.activeTransactions.sectionLabel',
          {
            defaultMessage: 'Transactions',
          }
        )}
      >
        <ChartSectionVis
          type="bar"
          formatter="number"
          seriesOverrides={{
            active: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.rdsMetricsLayout.active.chartLabel',
                { defaultMessage: 'Active' }
              ),
            },
            blocked: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.rdsMetricsLayout.blocked.chartLabel',
                { defaultMessage: 'Blocked' }
              ),
            },
          }}
        />
      </SubSection>
      <SubSection
        id="awsRDSLatency"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.sectionLabel',
          {
            defaultMessage: 'Latency',
          }
        )}
      >
        <ChartSectionVis
          type="bar"
          stacked={true}
          formatter="highPercision"
          formatterTemplate={'{{value}} ms'}
          seriesOverrides={{
            read: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.read.chartLabel',
                { defaultMessage: 'Read' }
              ),
            },
            write: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.write.chartLabel',
                { defaultMessage: 'Write' }
              ),
            },
            insert: {
              color: theme.eui.euiColorVis0,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.insert.chartLabel',
                { defaultMessage: 'Insert' }
              ),
            },
            update: {
              color: theme.eui.euiColorVis7,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.update.chartLabel',
                { defaultMessage: 'Update' }
              ),
            },
            commit: {
              color: theme.eui.euiColorVis3,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.rdsMetricsLayout.latency.commit.chartLabel',
                { defaultMessage: 'Commit' }
              ),
            },
          }}
        />
      </SubSection>
    </Section>
  </React.Fragment>
));
