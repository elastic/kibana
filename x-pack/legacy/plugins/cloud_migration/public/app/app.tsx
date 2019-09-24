/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiPageContent,
  EuiTitle,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import { useCore } from './app_context';
import { CloudMigrator } from './components';

export const App = () => {
  const { i18n } = useCore();

  const renderPageHeader = () => (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle size="l">
          <h1>
            {i18n.translate('xpack.cloudMigration.appTitle', {
              defaultMessage: 'Elastic cloud migration',
            })}
          </h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText>
          <p>
            {i18n.translate('xpack.cloudMigration.appDescription', {
              defaultMessage:
                'Migrate your on prem cluster to Elastic cloud and let us manage it meanwhile you are busy creating value to your customers.',
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPageContent>
      {renderPageHeader()}
      <EuiSpacer size="l" />
      <CloudMigrator />
    </EuiPageContent>
  );
};
