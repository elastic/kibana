/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import React, { useState } from 'react';
import styled from 'styled-components';

import { EuiButton } from '@elastic/eui';
import { HeaderPage } from '../../components/header_page';
import { StatefulOpenTimeline } from '../../components/open_timeline';
import { WrapperPage } from '../../components/wrapper_page';
import { SpyRoute } from '../../utils/route/spy_routes';
import * as i18n from './translations';
import { ImportRuleModal } from '../detection_engine/rules/components/import_rule_modal';

const TimelinesContainer = styled.div`
  width: 100%;
`;

interface TimelinesProps<TCache = object> {
  apolloClient: ApolloClient<TCache>;
}

type OwnProps = TimelinesProps;

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

const TimelinesPageComponent: React.FC<OwnProps> = ({ apolloClient }) => {
  const [showImportModal, setShowImportModal] = useState(false);
  return (
    <>
      <ImportRuleModal
        showModal={showImportModal}
        closeModal={() => setShowImportModal(false)}
        importComplete={() => {
          /* setImportCompleteToggle(!importCompleteToggle)*/
        }}
      />

      <WrapperPage>
        <HeaderPage border title={i18n.PAGE_TITLE}>
          <EuiButton
            iconType="indexOpen"
            isDisabled={false}
            onClick={() => {
              setShowImportModal(true);
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
