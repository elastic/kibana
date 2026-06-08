/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiTabbedContent, EuiPageTemplate, type EuiTabbedContentTab } from '@elastic/eui';
import { SetupPage } from './setup_page';
import { SlackOnboardingPage } from './slack_onboarding_page';

export { SetupPage, SlackOnboardingPage };

interface AppProps {
  coreStart: CoreStart;
}

const tabs: EuiTabbedContentTab[] = [
  {
    id: 'ramen',
    name: '🍜 Elastic Ramen',
    content: <SetupPage />,
  },
  {
    id: 'slack',
    name: 'Slack Integration',
    content: <SlackOnboardingPage />,
  },
];

const App: React.FC<AppProps> = ({ coreStart }) => {
  const [selectedTab, setSelectedTab] = useState(tabs[0]);

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Section>
        <EuiTabbedContent
          tabs={tabs}
          selectedTab={selectedTab}
          onTabClick={(tab) => setSelectedTab(tab)}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export const renderApp = ({
  coreStart,
  params,
}: {
  coreStart: CoreStart;
  params: AppMountParameters;
}) => {
  const { element } = params;

  ReactDOM.render(
    coreStart.rendering.addContext(
      <KibanaContextProvider services={coreStart}>
        <App coreStart={coreStart} />
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
