/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import ReactDOM from 'react-dom';

import 'uiExports/savedObjectTypes';

import 'ui/autoload/all';

// needed to make syntax highlighting work in ace editors
import 'ace';
import { AppMountParameters, CoreStart } from 'kibana/public';
import {
  IndexPatternsContract,
  Plugin as DataPlugin,
} from '../../../../../../src/plugins/data/public';

import { KibanaConfigTypeFix } from './contexts/kibana';

import { MlRouter } from './routing';

export interface MlDependencies extends AppMountParameters {
  npData: ReturnType<DataPlugin['start']>;
  indexPatterns: IndexPatternsContract;
}

interface AppProps {
  coreStart: CoreStart;
  indexPatterns: IndexPatternsContract;
}

const App: FC<AppProps> = ({ coreStart, indexPatterns }) => {
  const config = (coreStart.uiSettings as never) as KibanaConfigTypeFix; // TODO - make this UiSettingsClientContract, get rid of KibanaConfigTypeFix

  return (
    <MlRouter
      config={config}
      setBreadcrumbs={coreStart.chrome.setBreadcrumbs}
      indexPatterns={indexPatterns}
    />
  );
};

export const renderApp = (
  coreStart: CoreStart,
  depsStart: object,
  { element, indexPatterns }: MlDependencies
) => {
  ReactDOM.render(<App coreStart={coreStart} indexPatterns={indexPatterns} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
