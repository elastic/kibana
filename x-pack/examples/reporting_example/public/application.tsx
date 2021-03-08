import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { StartDeps } from './types';
import { ReportingExampleApp } from './components/app';

export const renderApp = (
  coreStart: CoreStart,
  startDeps: StartDeps,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <ReportingExampleApp basename={appBasePath} {...coreStart} {...startDeps} />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
