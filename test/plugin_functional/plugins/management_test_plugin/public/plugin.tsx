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

import * as React from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch, Route, Link } from 'react-router-dom';
import { CoreSetup, Plugin } from 'kibana/public';
import { ManagementSetup } from '../../../../../src/plugins/management/public';

export class ManagementTestPlugin
  implements Plugin<ManagementTestPluginSetup, ManagementTestPluginStart> {
  public setup(core: CoreSetup, { management }: { management: ManagementSetup }) {
    const testSection = management.sections.section.data;

    testSection.registerApp({
      id: 'test-management',
      title: 'Management Test',
      mount(params: any) {
        params.setBreadcrumbs([{ text: 'Management Test' }]);
        ReactDOM.render(
          <Router history={params.history}>
            <h1 data-test-subj="test-management-header">Hello from management test plugin</h1>
            <Switch>
              <Route path={'/one'}>
                <Link to={`${params.basePath}`} data-test-subj="test-management-link-basepath">
                  Link to basePath
                </Link>
              </Route>
              <Route path={'/'}>
                <Link to={'/one'} data-test-subj="test-management-link-one">
                  Link to /one
                </Link>
              </Route>
            </Switch>
          </Router>,
          params.element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(params.element);
        };
      },
    });

    testSection
      .registerApp({
        id: 'test-management-disabled',
        title: 'Management Test Disabled',
        mount(params) {
          params.setBreadcrumbs([{ text: 'Management Test Disabled' }]);
          ReactDOM.render(<div>This is a secret that should never be seen!</div>, params.element);

          return () => {
            ReactDOM.unmountComponentAtNode(params.element);
          };
        },
      })
      .disable();

    return {};
  }

  public start() {}
  public stop() {}
}

export type ManagementTestPluginSetup = ReturnType<ManagementTestPlugin['setup']>;
export type ManagementTestPluginStart = ReturnType<ManagementTestPlugin['start']>;
