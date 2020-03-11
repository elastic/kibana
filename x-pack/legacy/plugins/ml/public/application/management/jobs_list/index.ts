/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import React from 'react';
import { JobsListPage } from './components';

export const renderApp = (element: HTMLElement, appDependencies: any) => {
  ReactDOM.render(React.createElement(JobsListPage), element);

  return () => {
    unmountComponentAtNode(element);
  };
};
