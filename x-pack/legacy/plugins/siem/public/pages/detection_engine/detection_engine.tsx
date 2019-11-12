/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { HeaderSection } from '../../components/header_section';
import { HistogramSignals } from '../../components/page/detection_engine/histogram_signals';
import { SiemSearchBar } from '../../components/search_bar';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../components/detection_engine/utility_bar';
import { WrapperPage } from '../../components/wrapper_page';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { SpyRoute } from '../../utils/route/spy_routes';
import { DetectionEngineEmptyPage } from './detection_engine_empty_page';
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

      {/* Michael: Open signals datagrid here. Talk to Chandler Prall about possibility of early access. If not possible, use basic table. */}
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

      {/* Michael: Closed signals datagrid here. Talk to Chandler Prall about possibility of early access. If not possible, use basic table. */}
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

  const filterGroupOptions = ['open', 'closed'];
  const [filterGroupState, setFilterGroupState] = useState(filterGroupOptions[0]);

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
