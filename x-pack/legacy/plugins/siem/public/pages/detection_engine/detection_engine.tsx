/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { StickyContainer } from 'react-sticky';

import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { SiemSearchBar } from '../../components/search_bar';

import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { WrapperPage } from '../../components/wrapper_page';
import { SpyRoute } from '../../utils/route/spy_routes';

import { SignalsTable } from './components/signals';
import { SignalsCharts } from './components/signals_chart';
import { useSignalInfo } from './components/signals_info';
import { DetectionEngineEmptyPage } from './detection_engine_empty_page';
import * as i18n from './translations';

export const DetectionEngineComponent = React.memo(() => {
  const [lastSignals] = useSignalInfo({});
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
                <HeaderPage
                  border
                  subtitle={
                    <>
                      {i18n.LAST_SIGNAL}
                      {': '}
                      {lastSignals}
                    </>
                  }
                  title={i18n.PAGE_TITLE}
                >
                  <EuiButton fill href="#/detection-engine/rules" iconType="gear">
                    {i18n.BUTTON_MANAGE_RULES}
                  </EuiButton>
                </HeaderPage>

                <SignalsCharts />

                <EuiSpacer />

                <SignalsTable />
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
