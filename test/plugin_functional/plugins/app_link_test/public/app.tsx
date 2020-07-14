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
import ReactDOM from 'react-dom';
import { AppMountParameters, IBasePath, ApplicationStart } from 'kibana/public';
import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';

const FooApp = ({
  appId,
  targetAppId,
  basePath,
  application,
}: {
  appId: string;
  targetAppId: string;
  basePath: IBasePath;
  application: ApplicationStart;
}) => (
  <div data-test-subj={`app-${appId}`}>
    <RedirectAppLinks application={application}>
      <h1>{appId}</h1>
      <div>
        <a data-test-subj="applink-basic-test" href={basePath.prepend(`/app/${targetAppId}`)}>
          A with text
        </a>
        <br />
        <a href={basePath.prepend(`/app/${targetAppId}/some-path`)}>
          <div data-test-subj="applink-path-test">A link with a path in a nested div</div>
        </a>
        <br />
        <a
          data-test-subj="applink-hash-test"
          href={basePath.prepend(`/app/${targetAppId}/some-path#/some/hash`)}
        >
          <div>A link with a hash</div>
        </a>
        <br />
        <a href={basePath.prepend(`/app/${targetAppId}#bang`)}>
          <span data-test-subj="applink-nested-test">A text with a hash in a nested span</span>
        </a>
        <br />
        <a data-test-subj="applink-intra-test" href={basePath.prepend(`/app/${appId}/some-path`)}>
          Link to the same app
        </a>
      </div>
    </RedirectAppLinks>
  </div>
);

interface AppOptions {
  appId: string;
  targetAppId: string;
  basePath: IBasePath;
  application: ApplicationStart;
}

export const renderApp = (
  { appId, basePath, targetAppId, application }: AppOptions,
  { element }: AppMountParameters
) => {
  ReactDOM.render(
    <FooApp
      appId={appId}
      targetAppId={targetAppId}
      basePath={basePath}
      application={application}
    />,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
