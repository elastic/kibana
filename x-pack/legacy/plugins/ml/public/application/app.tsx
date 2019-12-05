/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import ReactDOM from 'react-dom';

import 'uiExports/savedObjectTypes';

import 'ui/autoload/all';
import { IndexPatterns } from 'ui/index_patterns';

// import { UiSettingsClientContract } from 'src/core/public';
// needed to make syntax highlighting work in ace editors
import 'ace';

// import {
//   EuiPage,
//   EuiPageBody,
//   EuiPageContent,
//   EuiPageContentBody,
//   EuiPageContentHeader,
//   EuiPageContentHeaderSection,
//   EuiPageHeader,
//   EuiPageHeaderSection,
//   EuiPageSideBar,
//   EuiTitle,
//   EuiSideNav,
// } from '@elastic/eui';

import { AppMountContext, AppMountParameters } from 'kibana/public';
import { DataStart } from 'src/legacy/core_plugins/data/public';
// import { ANOMALY_DETECTION_BREADCRUMB } from './breadcrumbs';

import { Plugin as DataPlugin } from '../../../../../../src/plugins/data/public';
import { KibanaConfigTypeFix } from './contexts/kibana';

import { MlRouter } from './routing';

export interface MlDependencies extends AppMountParameters {
  // data: DataStart;
  npData: ReturnType<DataPlugin['start']>;
  indexPatterns: DataStart['indexPatterns']['indexPatterns'];
}

interface AppProps {
  basename: string;
  context: AppMountContext;
  indexPatterns: IndexPatterns;
}

const App: FC<AppProps> = ({ basename, context, indexPatterns }) => {
  const config = (context.core.uiSettings as never) as KibanaConfigTypeFix; // TODO - make this UiSettingsClientContract, get rid of KibanaConfigTypeFix

  return (
    <MlRouter
      basename={basename}
      config={config}
      setBreadCrumbs={context.core.chrome.setBreadcrumbs}
      indexPatterns={indexPatterns}
    />
  );
};

export const renderApp = (
  context: AppMountContext,
  { appBasePath, element, indexPatterns }: MlDependencies
) => {
  const basename = `${appBasePath}#`;
  ReactDOM.render(
    <App basename={basename} context={context} indexPatterns={indexPatterns} />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
