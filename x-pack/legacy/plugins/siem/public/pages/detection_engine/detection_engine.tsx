/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  HistogramBarSeries,
  Settings,
  getAxisId,
  getSpecId,
  niceTimeFormatByDay,
  timeFormatter,
} from '@elastic/charts';
import {
  EuiButton,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import { StickyContainer } from 'react-sticky';
import { npStart } from 'ui/new_platform';

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

const OpenSignals = React.memo(() => {
  return (
    <>
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText>{`${i18n.PANEL_SUBTITLE_SHOWING}: 7,712 signals`}</UtilityBarText>
          </UtilityBarGroup>

          <UtilityBarGroup>
            <UtilityBarText>{'Selected: 20 signals'}</UtilityBarText>

            <UtilityBarAction
              iconSide="right"
              iconType="arrowDown"
              popoverContent={<p>{'Batch actions context menu here.'}</p>}
            >
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
            <UtilityBarAction
              iconSide="right"
              iconType="arrowDown"
              popoverContent={<p>{'Customize columns context menu here.'}</p>}
            >
              {'Customize columns'}
            </UtilityBarAction>

            <UtilityBarAction iconType="indexMapping">{'Aggregate data'}</UtilityBarAction>
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>

      {/* Open signals datagrid here. Talk to Chandler Prall about possibility of early access. If not possible, use basic table. */}
    </>
  );
});

const ClosedSignals = React.memo(() => {
  return (
    <>
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText>{`${i18n.PANEL_SUBTITLE_SHOWING}: 7,712 signals`}</UtilityBarText>
          </UtilityBarGroup>
        </UtilityBarSection>

        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarAction
              iconSide="right"
              iconType="arrowDown"
              popoverContent={<p>{'Customize columns context menu here.'}</p>}
            >
              {'Customize columns'}
            </UtilityBarAction>

            <UtilityBarAction iconType="indexMapping">{'Aggregate data'}</UtilityBarAction>
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>

      {/* Closed signals datagrid here. Talk to Chandler Prall about possibility of early access. If not possible, use basic table. */}
    </>
  );
});

export const DetectionEngineComponent = React.memo(() => {
  const sampleChartOptions = [
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
  const sampleChartData = [
    { x: 1571090784000, y: 2, a: 'a' },
    { x: 1571090784000, y: 2, b: 'b' },
    { x: 1571093484000, y: 7, a: 'a' },
    { x: 1571096184000, y: 3, a: 'a' },
    { x: 1571098884000, y: 2, a: 'a' },
    { x: 1571101584000, y: 7, a: 'a' },
    { x: 1571104284000, y: 3, a: 'a' },
    { x: 1571106984000, y: 2, a: 'a' },
    { x: 1571109684000, y: 7, a: 'a' },
    { x: 1571112384000, y: 3, a: 'a' },
    { x: 1571115084000, y: 2, a: 'a' },
    { x: 1571117784000, y: 7, a: 'a' },
    { x: 1571120484000, y: 3, a: 'a' },
    { x: 1571123184000, y: 2, a: 'a' },
    { x: 1571125884000, y: 7, a: 'a' },
    { x: 1571128584000, y: 3, a: 'a' },
    { x: 1571131284000, y: 2, a: 'a' },
    { x: 1571133984000, y: 7, a: 'a' },
    { x: 1571136684000, y: 3, a: 'a' },
    { x: 1571139384000, y: 2, a: 'a' },
    { x: 1571142084000, y: 7, a: 'a' },
    { x: 1571144784000, y: 3, a: 'a' },
    { x: 1571147484000, y: 2, a: 'a' },
    { x: 1571150184000, y: 7, a: 'a' },
    { x: 1571152884000, y: 3, a: 'a' },
    { x: 1571155584000, y: 2, a: 'a' },
    { x: 1571158284000, y: 7, a: 'a' },
    { x: 1571160984000, y: 3, a: 'a' },
    { x: 1571163684000, y: 2, a: 'a' },
    { x: 1571166384000, y: 7, a: 'a' },
    { x: 1571169084000, y: 3, a: 'a' },
    { x: 1571171784000, y: 2, a: 'a' },
    { x: 1571174484000, y: 7, a: 'a' },
  ];

  const filterGroupOptions = ['open', 'closed'];
  const [filterGroupState, setFilterGroupState] = useState(filterGroupOptions[0]);

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
            <EuiSelect
              options={sampleChartOptions}
              prepend="Stack by"
              value={sampleChartOptions[0].value}
            />
          </HeaderSection>

          <Chart size={['100%', 259]}>
            <Settings
              legendPosition="bottom"
              showLegend
              theme={npStart.plugins.eui_utils.useChartsTheme()}
            />

            <Axis
              id={getAxisId('signalAxisX')}
              position="bottom"
              tickFormat={timeFormatter(niceTimeFormatByDay(1))}
            />

            <Axis id={getAxisId('signalAxisY')} position="left" />

            <HistogramBarSeries
              id={getSpecId('signalBar')}
              xScaleType="time"
              yScaleType="linear"
              xAccessor="x"
              yAccessors={['y']}
              splitSeriesAccessors={['a', 'b']}
              data={sampleChartData}
            />
          </Chart>
        </EuiPanel>

        <EuiSpacer />

        <EuiPanel>
          <HeaderSection title="All signals">
            <EuiFilterGroup>
              <EuiFilterButton
                hasActiveFilters={filterGroupState === filterGroupOptions[0]}
                onClick={() => setFilterGroupState(filterGroupOptions[0])}
                withNext
              >
                {'Open signals'}
              </EuiFilterButton>

              <EuiFilterButton
                hasActiveFilters={filterGroupState === filterGroupOptions[1]}
                onClick={() => setFilterGroupState(filterGroupOptions[1])}
              >
                {'Closed signals'}
              </EuiFilterButton>
            </EuiFilterGroup>
          </HeaderSection>

          {filterGroupState === filterGroupOptions[0] ? <OpenSignals /> : <ClosedSignals />}
        </EuiPanel>
      </StickyContainer>

      <SpyRoute />
    </>
  );
});
DetectionEngineComponent.displayName = 'DetectionEngineComponent';
