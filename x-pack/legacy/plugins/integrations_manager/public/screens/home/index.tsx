/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { EuiHorizontalRule, EuiPage, EuiPageBody, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { PLUGIN } from '../../../common/constants';
import { useBreadcrumbs, useLinks } from '../../hooks';
import { Header } from './header';
import { SearchIntegrations } from './search_integrations';
import { IntegrationLists } from './integration_lists';

export const FullBleedPage = styled(EuiPage)`
  padding: 0;
`;

export function Home() {
  const { toListView } = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }]);

  const maxContentWidth = 1200;
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <Fragment>
      <Header restrictWidth={maxContentWidth} onSearch={setSearchTerm} />
      <EuiHorizontalRule margin="none" />
      <FullBleedPage>
        <EuiPageBody restrictWidth={maxContentWidth}>
          <Fragment>
            <EuiSpacer size="l" />
            {searchTerm ? <SearchIntegrations term={searchTerm} /> : <IntegrationLists />}
          </Fragment>
        </EuiPageBody>
      </FullBleedPage>
    </Fragment>
  );
}
