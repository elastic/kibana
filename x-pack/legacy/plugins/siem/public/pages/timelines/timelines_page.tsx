/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';

import { EuiButton } from '@elastic/eui';
import { HeaderPage } from '../../components/header_page';
import { StatefulOpenTimeline } from '../../components/open_timeline';
import { WrapperPage } from '../../components/wrapper_page';
import { SpyRoute } from '../../utils/route/spy_routes';
import * as i18n from './translations';
import { ImportRuleModal } from '../detection_engine/rules/components/import_rule_modal';
import { importTimelines } from '../../containers/timeline/all/api';

const TimelinesContainer = styled.div`
  width: 100%;
`;

interface TimelinesProps<TCache = object> {
  apolloClient: ApolloClient<TCache>;
}

type OwnProps = TimelinesProps;

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

const TimelinesPageComponent: React.FC<OwnProps> = ({ apolloClient }) => {
  const [importCompleteToggle, setImportCompleteToggle] = useState(false);
  return (
    <>
      <ImportRuleModal
        showModal={importCompleteToggle}
        closeModal={() => setImportCompleteToggle(false)}
        importComplete={useCallback(() => {
          setImportCompleteToggle(!importCompleteToggle);
        }, [setImportCompleteToggle])}
        importData={importTimelines}
      />

      <WrapperPage>
        <HeaderPage border title={i18n.PAGE_TITLE}>
          <EuiButton
            iconType="indexOpen"
            isDisabled={false}
            onClick={() => {
              setImportCompleteToggle(true);
            }}
          >
            {'Import Timeline'}
          </EuiButton>
        </HeaderPage>

        <TimelinesContainer>
          <StatefulOpenTimeline
            apolloClient={apolloClient}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            isModal={false}
            title={i18n.ALL_TIMELINES_PANEL_TITLE}
          />
        </TimelinesContainer>
      </WrapperPage>

      <SpyRoute />
    </>
  );
};

export const TimelinesPage = React.memo(TimelinesPageComponent);
