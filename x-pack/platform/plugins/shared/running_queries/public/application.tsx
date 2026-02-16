/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiPageTemplate, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';

const RunningQueriesApp: React.FC = () => {
  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.runningQueries.title', {
          defaultMessage: 'Running Queries',
        })}
      />
      <EuiPageTemplate.Section>
        <EuiText>
          <p>
            {i18n.translate('xpack.runningQueries.description', {
              defaultMessage: 'View and manage currently running queries.',
            })}
          </p>
        </EuiText>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export const renderApp = (coreStart: CoreStart, params: ManagementAppMountParams) => {
  ReactDOM.render(
    coreStart.rendering.addContext(<RunningQueriesApp />),
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
