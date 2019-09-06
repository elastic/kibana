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
import { Page } from './page';

import { GuideSection } from './guide_section';

// @ts-ignore
import commonTypes from '!!raw-loader!./../../../../../src/plugins/search/common/types';
// @ts-ignore
import publicPlugin from '!!raw-loader!./../../../../../src/plugins/search/public/plugin';
// @ts-ignore
import publicTypes from '!!raw-loader!./../../../../../src/plugins/search/public/types';
// @ts-ignore
import plugin from '!!raw-loader!./../../../../../src/plugins/search/server/plugin';
// @ts-ignore
import setupContract from '!!raw-loader!./../../../../../src/plugins/search/server/i_setup_contract';
// @ts-ignore
import publicSetupContract from '!!raw-loader!./../../../../../src/plugins/search/public/i_setup_contract';

export const SearchApiPage = () => (
  <Page title="Search API">
    <GuideSection
      codeSections={[
        {
          title: 'Public',
          code: [
            {
              description: `Setup contract (src/plugins/search/public/i_setup_contract). The setup contract exposes 
                methods to register a custom search strategy, as well as context that will be provided to your search
                strategy.`,
              snippet: publicSetupContract,
            },
            {
              description: 'Plugin definition (src/plugins/search/public/plugin)',
              snippet: publicPlugin,
            },
            {
              description: 'Plugin types (src/plugins/search/public/types)',
              snippet: publicTypes,
            },
          ],
        },
        {
          title: 'Server',
          code: [
            {
              description: 'Plugin definition (src/plugins/search/server/plugin)',
              snippet: plugin,
            },
            {
              description: 'Setup contract (src/plugins/search/server/i_setup_contract)',
              snippet: setupContract,
            },
          ],
        },
      ]}
    ></GuideSection>
  </Page>
);
