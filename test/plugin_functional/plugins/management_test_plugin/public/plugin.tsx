/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch, Route, Link } from 'react-router-dom';
import { CoreSetup, Plugin } from '@kbn/core/public';
import { ManagementSetup } from '@kbn/management-plugin/public';

export class ManagementTestPlugin
  implements Plugin<ManagementTestPluginSetup, ManagementTestPluginStart>
{
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
