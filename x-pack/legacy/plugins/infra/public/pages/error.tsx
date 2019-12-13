/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiCallOut,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import euiStyled from '../../../../common/eui_styled_components';
import { Header } from '../components/header';
import { ColumnarPage, PageContent } from '../components/page';

const DetailPageContent = euiStyled(PageContent)`
  overflow: auto;
  background-color: ${props => props.theme.eui.euiColorLightestShade};
`;

interface Props {
  message: string;
}

export const Error: React.FC<Props> = ({ message }) => {
  return (
    <ColumnarPage>
      <Header />
      <DetailPageContent>
        <ErrorPageBody message={message} />
      </DetailPageContent>
    </ColumnarPage>
  );
};

export const ErrorPageBody: React.FC<{ message: string }> = ({ message }) => {
  return (
    <EuiPage style={{ flex: '1 0 auto' }}>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="m">
              <h1>
                <FormattedMessage
                  id="xpack.infra.errorPage.unexpectedErrorTitle"
                  defaultMessage="Oops!"
                />
              </h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiCallOut color="danger" title={message} iconType={'alert'}>
            <p>
              <FormattedMessage
                id="xpack.infra.errorPage.tryAgainDescription "
                defaultMessage="Please click the back button and try again."
              />
            </p>
          </EuiCallOut>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
