/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, IBasePath, ApplicationStart } from 'kibana/public';
/** @deprecated Use `RedirectAppLinks` from `@kbn/shared-ux-components */
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
