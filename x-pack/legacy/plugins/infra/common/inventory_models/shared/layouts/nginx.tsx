/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayoutPropsWithTheme } from '../../../../public/pages/metrics/types';
import { Section } from '../../../../public/pages/metrics/components/section';
import { SubSection } from '../../../../public/pages/metrics/components/sub_section';
import { ChartSectionVis } from '../../../../public/pages/metrics/components/chart_section_vis';
import { withTheme } from '../../../../../../common/eui_styled_components';

export const Layout = withTheme(({ metrics, theme }: LayoutPropsWithTheme) => (
  <React.Fragment>
    <Section navLabel="Nginx" sectionLabel="Nginx" metrics={metrics}>
      <SubSection
        id="nginxHits"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.hitsSection.sectionLabel',
          {
            defaultMessage: 'Hits',
          }
        )}
      >
        <ChartSectionVis
          stacked={true}
          type="bar"
          formatter="abbreviatedNumber"
          seriesOverrides={{
            '200s': { color: theme.eui.euiColorVis1 },
            '300s': { color: theme.eui.euiColorVis5 },
            '400s': { color: theme.eui.euiColorVis2 },
            '500s': { color: theme.eui.euiColorVis9 },
          }}
        />
      </SubSection>
      <SubSection
        id="nginxRequestRate"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.requestRateSection.sectionLabel',
          {
            defaultMessage: 'Request Rate',
          }
        )}
      >
        <ChartSectionVis
          type="area"
          formatter="abbreviatedNumber"
          formatterTemplate="{{value}}/s"
          seriesOverrides={{
            rate: { color: theme.eui.euiColorVis1 },
          }}
        />
      </SubSection>
      <SubSection
        id="nginxActiveConnections"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.activeConnectionsSection.sectionLabel',
          {
            defaultMessage: 'Active Connections',
          }
        )}
      >
        <ChartSectionVis
          type="area"
          formatter="abbreviatedNumber"
          seriesOverrides={{
            connections: {
              color: theme.eui.euiColorVis1,
              type: 'bar',
            },
          }}
        />
      </SubSection>
      <SubSection
        id="nginxRequestsPerConnection"
        label={i18n.translate(
          'xpack.infra.metricDetailPage.nginxMetricsLayout.requestsPerConnectionsSection.sectionLabel',
          {
            defaultMessage: 'Requests per Connections',
          }
        )}
      >
        <ChartSectionVis
          type="bar"
          formatter="abbreviatedNumber"
          seriesOverrides={{
            reqPerConns: {
              color: theme.eui.euiColorVis1,
              name: i18n.translate(
                'xpack.infra.metricDetailPage.nginxMetricsLayout.requestsPerConnectionsSection.reqsPerConnSeriesLabel',
                {
                  defaultMessage: 'reqs per conn',
                }
              ),
            },
          }}
        />
      </SubSection>
    </Section>
  </React.Fragment>
));
