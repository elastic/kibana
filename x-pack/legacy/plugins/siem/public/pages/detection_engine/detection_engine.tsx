/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiPanel, EuiSelect, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { StickyContainer } from 'react-sticky';

import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { HeaderSection } from '../../components/header_section';
import { HistogramSignals } from '../../components/page/detection_engine/histogram_signals';
import { SiemSearchBar } from '../../components/search_bar';
import { WrapperPage } from '../../components/wrapper_page';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { SpyRoute } from '../../utils/route/spy_routes';
import { DetectionEngineEmptyPage } from './detection_engine_empty_page';
import * as i18n from './translations';
import { SignalsTable } from './signals';
import { GlobalTime } from '../../containers/global_time';

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

  return (
    <>
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) => {
          return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <StickyContainer>
              <FiltersGlobal>
                <SiemSearchBar id="global" indexPattern={indexPattern} />
              </FiltersGlobal>

              <WrapperPage>
                <HeaderPage border subtitle={i18n.PAGE_SUBTITLE} title={i18n.PAGE_TITLE}>
                  <EuiButton fill href="#/detection-engine/rules" iconType="gear">
                    {i18n.BUTTON_MANAGE_RULES}
                  </EuiButton>
                </HeaderPage>

                <EuiPanel>
                  <HeaderSection title="Signal detection frequency">
                    <EuiSelect
                      options={sampleChartOptions}
                      onChange={() => {}}
                      prepend="Stack by"
                      value={sampleChartOptions[0].value}
                    />
                  </HeaderSection>

                  <HistogramSignals />
                </EuiPanel>

                <EuiSpacer />
                <GlobalTime>{({ to, from }) => <SignalsTable from={from} to={to} />}</GlobalTime>
              </WrapperPage>
            </StickyContainer>
          ) : (
            <WrapperPage>
              <HeaderPage border title={i18n.PAGE_TITLE} />

              <DetectionEngineEmptyPage />
            </WrapperPage>
          );
        }}
      </WithSource>

      <SpyRoute />
    </>
  );
});
DetectionEngineComponent.displayName = 'DetectionEngineComponent';
