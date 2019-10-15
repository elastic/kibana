/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  HistogramBarSeries,
  Position,
  ScaleType,
  Settings,
  getAxisId,
  getSpecId,
} from '@elastic/charts';
import { EuiButton, EuiButtonGroup, EuiIcon, EuiPanel, EuiSelect, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { StickyContainer } from 'react-sticky';

import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { HeaderSection } from '../../components/header_section';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../components/utility_bar';
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
                { x: 0, y: 2, a: 'a' },
                { x: 0, y: 2, b: 'b' },
                { x: 1, y: 7, a: 'a' },
                { x: 2, y: 3, a: 'a' },
                { x: 3, y: 2, a: 'a' },
                { x: 4, y: 7, a: 'a' },
                { x: 5, y: 3, a: 'a' },
                { x: 6, y: 2, a: 'a' },
                { x: 7, y: 7, a: 'a' },
                { x: 8, y: 3, a: 'a' },
                { x: 9, y: 2, a: 'a' },
                { x: 10, y: 7, a: 'a' },
                { x: 11, y: 3, a: 'a' },
                { x: 12, y: 2, a: 'a' },
                { x: 13, y: 7, a: 'a' },
                { x: 14, y: 3, a: 'a' },
                { x: 15, y: 2, a: 'a' },
                { x: 16, y: 7, a: 'a' },
                { x: 17, y: 3, a: 'a' },
                { x: 18, y: 2, a: 'a' },
                { x: 19, y: 7, a: 'a' },
                { x: 20, y: 3, a: 'a' },
                { x: 21, y: 2, a: 'a' },
                { x: 22, y: 7, a: 'a' },
                { x: 23, y: 3, a: 'a' },
                { x: 24, y: 2, a: 'a' },
                { x: 25, y: 7, a: 'a' },
                { x: 26, y: 3, a: 'a' },
                { x: 27, y: 2, a: 'a' },
                { x: 28, y: 7, a: 'a' },
                { x: 29, y: 3, a: 'a' },
                { x: 30, y: 2, a: 'a' },
                { x: 31, y: 7, a: 'a' },
              ]}
            />
          </Chart>
        </EuiPanel>

        <EuiSpacer />

        <EuiPanel>
          <HeaderSection title="All signals">
            <EuiButtonGroup
              color="primary"
              legend="Signal types"
              onChange={() => {
                return null;
              }}
              options={toggleButtons}
            />
          </HeaderSection>

          <UtilityBar>
            <UtilityBarSection>
              <UtilityBarGroup>
                <UtilityBarText>{`${i18n.PANEL_SUBTITLE_SHOWING}: 7,712 signals`}</UtilityBarText>
              </UtilityBarGroup>

              <UtilityBarGroup>
                <UtilityBarText>{'Selected: 20 signals'}</UtilityBarText>

                <UtilityBarAction popoverContent={<p>{'Batch actions context menu here.'}</p>}>
                  {'Batch actions'}
                </UtilityBarAction>

                <UtilityBarAction iconType="listAdd">
                  {'Select all signals on all pages'}
                </UtilityBarAction>
              </UtilityBarGroup>

              <UtilityBarGroup>
                <UtilityBarAction iconType="cross">{'Clear 7 filters'}</UtilityBarAction>

                <UtilityBarAction iconType="cross">{'Clear aggregation'}</UtilityBarAction>
              </UtilityBarGroup>
            </UtilityBarSection>

            <UtilityBarSection>
              <UtilityBarGroup>
                <UtilityBarAction popoverContent={<p>{'Customize columns context menu here.'}</p>}>
                  {'Customize columns'}
                </UtilityBarAction>

                <UtilityBarAction iconType="indexMapping">{'Aggregate data'}</UtilityBarAction>
              </UtilityBarGroup>
            </UtilityBarSection>
          </UtilityBar>

          {/* Open signals datagrid here. Talk to Chandler Prall about possibility of early access. If not possible, use basic table. */}
        </EuiPanel>
      </StickyContainer>

      <SpyRoute />
    </>
  );
});
DetectionEngineComponent.displayName = 'DetectionEngineComponent';
