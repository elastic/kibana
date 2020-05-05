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

import { AppMountParameters, IBasePath } from 'kibana/public';
import ReactDOM from 'react-dom';
import React from 'react';

const FooApp = ({
  appId,
  targetAppId,
  basePath,
}: {
  appId: string;
  targetAppId: string;
  basePath: IBasePath;
}) => (
  <div data-test-subj={`app-${appId}`}>
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
      <a
        data-test-subj="applink-prevention-test"
        href={basePath.prepend(`/app/${targetAppId}/path`)}
        className="disableCoreNavigation"
      >
        <span>Link with navigation prevention class on self</span>
      </a>
      <br />
      <div className="disableCoreNavigation">
        <a
          data-test-subj="applink-parent-prevention-test"
          href={basePath.prepend(`/app/${targetAppId}/other`)}
        >
          <span>Link with navigation prevention class on parent</span>
        </a>
      </div>
    </div>
  </div>
);

interface AppOptions {
  appId: string;
  targetAppId: string;
  basePath: IBasePath;
}

export const renderApp = (
  { appId, basePath, targetAppId }: AppOptions,
  { element }: AppMountParameters
) => {
  ReactDOM.render(<FooApp appId={appId} targetAppId={targetAppId} basePath={basePath} />, element);
  return () => ReactDOM.unmountComponentAtNode(element);
};
