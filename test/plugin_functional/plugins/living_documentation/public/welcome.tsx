/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';

import {
  EuiCodeBlock,
  EuiText,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';

export const WelcomePage = () => (
  <EuiPageBody data-test-subj="welcomePage">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Welcome to living developer documentation</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h2>Hello!</h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiText>
          <p>
            Developing plugins for Kibana can be a daunting task. Here we strive to document
            different extensible parts of the system using real, tested examples so they will never
            go out of date. Copy code snippets, and see real demos of various parts of our system.
            This documentation is actually in and of itself, pluggable! Any developer who wishes to
            add a section to document any new extension points they add can do so via
          </p>
          <EuiCodeBlock language="ts">
            {`public setup(core: CoreSetup, deps: ISearchExplorerSetupDependencies) {
              deps.livingDocumentation.registerSection({
                id: 'actionWelcome',
                title: 'Ui Actions',
                subSections: [
                  {
                    id: 'actionUiExample',
                    title: 'Ui Action Example',
                    renderComponent: async () => {
                      const { ActionExample } = await import('./action_example');
                      return <ActionExample />;
                    },
                  },
                ],
                renderComponent: async () => {
                  const { WelcomePage } = await import('./welcome');
                  return <WelcomePage />;
                },
              });
            }`}
          </EuiCodeBlock>
          <p>
            Use the `GuideSection` react component for easy formatting of demos and code samples
          </p>
        </EuiText>
      </EuiPageContentBody>
    </EuiPageContent>
  </EuiPageBody>
);
