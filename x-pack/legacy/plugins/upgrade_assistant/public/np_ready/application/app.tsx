/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiPageHeader, EuiPageHeaderSection, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { NEXT_MAJOR_VERSION } from '../../../common/version';
import { UpgradeAssistantTabs } from './components/tabs';
import { AppContextProvider, ContextValue, AppContext } from './app_context';

type AppDependencies = ContextValue;

export const RootComponent = (deps: AppDependencies) => {
  return (
    <AppContextProvider value={deps}>
      <div data-test-subj="upgradeAssistantRoot">
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.upgradeAssistant.appTitle"
                  defaultMessage="{version} Upgrade Assistant"
                  values={{ version: `${NEXT_MAJOR_VERSION}.0` }}
                />
              </h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <AppContext.Consumer>
          {({ http }) => <UpgradeAssistantTabs http={http} />}
        </AppContext.Consumer>
      </div>
    </AppContextProvider>
  );
};
