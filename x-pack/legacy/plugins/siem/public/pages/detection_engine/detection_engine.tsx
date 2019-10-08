/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonGroup, EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { StickyContainer } from 'react-sticky';

import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { HeaderPanel } from '../../components/header_panel';
import { SpyRoute } from '../../utils/route/spy_routes';
import { DetectionEngineKql } from './kql';
import * as i18n from './translations';

export const DetectionEngineComponent = React.memo(() => {
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

        <HeaderPage subtitle={i18n.PAGE_SUBTITLE} title={i18n.PAGE_TITLE}>
          <EuiButton fill href="#/detection-engine/rules" iconType="gear">
            {i18n.BUTTON_MANAGE_RULES}
          </EuiButton>
        </HeaderPage>

        <EuiPanel>
          <HeaderPanel title="Signal detection frequency">{'Stack by...'}</HeaderPanel>
          {'Chart here...'}
        </EuiPanel>

        <EuiSpacer />

        <EuiPanel>
          <HeaderPanel
            subtitle={`${i18n.PANEL_SUBTITLE_SHOWING}: 7,712 signals`}
            title="All signals"
          >
            <EuiButtonGroup
              color="primary"
              legend="Signal types"
              onChange={() => null}
              options={toggleButtons}
            />
          </HeaderPanel>
          {'Datagrid here...'}
        </EuiPanel>
      </StickyContainer>

      <SpyRoute />
    </>
  );
});
DetectionEngineComponent.displayName = 'DetectionEngineComponent';
