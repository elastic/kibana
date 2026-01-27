/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { DATA_SOURCES_FULL_TITLE } from '../../common/constants';

export const DataSourcesLandingPage = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={DATA_SOURCES_FULL_TITLE}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
        `}
      >
        <EuiText>
          {i18n.translate('xpack.dataSources.landingPage.description', {
            defaultMessage: 'Connect to external data sources to power your agents and indices.',
          })}
        </EuiText>
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section />
    </KibanaPageTemplate>
  );
};
