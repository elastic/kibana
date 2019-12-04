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
      navLabel="AWS EC2"
      sectionLabel={i18n.translate(
        'xpack.infra.metricDetailPage.ec2MetricsLayout.overviewSection.sectionLabel',
        {
          defaultMessage: 'Aws EC2 Overview',
        }
      )}
      metrics={metrics}
    >
      <SubSection
        id="awsEC2CpuUtilization"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.ec2MetricsLayout.cpuUsageSection.sectionLabel',
          {
            defaultMessage: 'CPU Usage',
          }
        )}
      >
        <ChartSectionVis
          stacked={true}
          type="area"
          formatter="percent"
          seriesOverrides={{
            total: { color: theme.eui.euiColorVis1 },
          }}
        />
      </SubSection>
      <SubSection
        id="awsEC2NetworkTraffic"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.ec2MetricsLayout.networkTrafficSection.sectionLabel',
          {
            defaultMessage: 'Network Traffic',
          }
        )}
      >
        <ChartSectionVis
          formatter="bits"
          formatterTemplate="{{value}}/s"
          type="area"
          seriesOverrides={{
            rx: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.networkRxRateSeriesLabel',
                {
                  defaultMessage: 'in',
                }
              ),
            },
            tx: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.networkTxRateSeriesLabel',
                {
                  defaultMessage: 'out',
                }
              ),
            },
          }}
        />
      </SubSection>
      <SubSection
        id="awsEC2DiskIOBytes"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.ec2MetricsLayout.diskIOBytesSection.sectionLabel',
          {
            defaultMessage: 'Disk IO (Bytes)',
          }
        )}
      >
        <ChartSectionVis
          formatter="bytes"
          formatterTemplate="{{value}}/s"
          type="area"
          seriesOverrides={{
            write: {
              color: theme.eui.euiColorVis2,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.ec2MetricsLayout.diskIOBytesSection.writeLabel',
                {
                  defaultMessage: 'writes',
                }
              ),
            },
            read: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.ec2MetricsLayout.diskIOBytesSection.readLabel',
                {
                  defaultMessage: 'reads',
                }
              ),
            },
          }}
        />
      </SubSection>
    </Section>
  </React.Fragment>
));
