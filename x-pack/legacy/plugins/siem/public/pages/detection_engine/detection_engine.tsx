/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Chart,
  BarSeries,
  Axis,
  HistogramBarSeries,
  Position,
  getAxisId,
  getSpecId,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiButton, EuiButtonGroup, EuiPanel, EuiSelect, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { StickyContainer } from 'react-sticky';

import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { HeaderSection } from '../../components/header_section';
import { SpyRoute } from '../../utils/route/spy_routes';
import { DetectionEngineKql } from './kql';
import * as i18n from './translations';

export const DetectionEngineComponent = React.memo(() => {
  const stackOptions = [
    { text: 'Risk scores', value: 'risk_scores' },
    { text: 'Severities', value: 'severities' },
    { text: 'Top destination IPs', value: 'destination_ips' },
    { text: 'Top event actions', value: 'event_actions' },
    { text: 'Top event categories', value: 'event_categories' },
    { text: 'Top host names', value: 'host_names' },
    { text: 'Top rule types', value: 'rule_types' },
    { text: 'Top rules', value: 'rules' },
    { text: 'Top source IPs', value: 'source_ips' },
    { text: 'Top users', value: 'users' },
  ];

  const idPrefix = 'signalType';
  const toggleButtons = [
    {
      id: `${idPrefix}0`,
      label: 'Open signals',
    },
    {
      id: `${idPrefix}1`,
      label: 'Closed signals',
    },
  ];

  return (
    <>
      <StickyContainer>
        <FiltersGlobal>
          <DetectionEngineKql />
        </FiltersGlobal>

        <HeaderPage border subtitle={i18n.PAGE_SUBTITLE} title={i18n.PAGE_TITLE}>
          <EuiButton fill href="#/detection-engine/rules" iconType="gear">
            {i18n.BUTTON_MANAGE_RULES}
          </EuiButton>
        </HeaderPage>

        <EuiPanel>
          <HeaderSection title="Signal detection frequency">
            <EuiSelect options={stackOptions} prepend="Stack by" value={stackOptions[0].value} />
          </HeaderSection>

          <Chart size={['100%', 259]}>
            <Settings legendPosition="bottom" showLegend />

            <Axis id="signalAxisX" position="bottom" />

            <Axis id="signalAxisY" position="left" />

            <HistogramBarSeries
              id="signalBar"
              xScaleType="linear"
              yScaleType="linear"
              xAccessor="x"
              yAccessors={['y']}
              stackAccessors={['x']}
              splitSeriesAccessors={['a', 'b']}
              data={[
                { x: 1551438000000, y: 2, a: 'a' },
                { x: 1551438000000, y: 2, b: 'b' },
                { x: 1551439000000, y: 7, a: 'a' },
                { x: 1551440000000, y: 3, a: 'a' },
              ]}
            />
          </Chart>
        </EuiPanel>

        <EuiSpacer />

        <EuiPanel>
          <HeaderSection
            subtitle={`${i18n.PANEL_SUBTITLE_SHOWING}: 7,712 signals`}
            title="All signals"
          >
            <EuiButtonGroup
              color="primary"
              legend="Signal types"
              onChange={() => {
                return null;
              }}
              options={toggleButtons}
            />
          </HeaderSection>
          {'Datagrid here (talk to Chandler Prall about possibility of early access)...'}
        </EuiPanel>
      </StickyContainer>

      <SpyRoute />
    </>
  );
});
DetectionEngineComponent.displayName = 'DetectionEngineComponent';
