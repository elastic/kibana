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

import { AppMountContext, AppMountParameters } from 'kibana/public';
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
  context: AppMountContext;
  indexPatterns: IndexPatternsContract;
}

const App: FC<AppProps> = ({ context, indexPatterns }) => {
  const config = (context.core.uiSettings as never) as KibanaConfigTypeFix; // TODO - make this UiSettingsClientContract, get rid of KibanaConfigTypeFix

  return (
    <MlRouter
      config={config}
      setBreadcrumbs={context.core.chrome.setBreadcrumbs}
      indexPatterns={indexPatterns}
    />
  );
};

export const renderApp = (context: AppMountContext, { element, indexPatterns }: MlDependencies) => {
  ReactDOM.render(<App context={context} indexPatterns={indexPatterns} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
