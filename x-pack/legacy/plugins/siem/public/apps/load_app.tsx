/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { startApp } from './start_app';
import { compose } from '../lib/compose/kibana_compose';
import { AppFrontendLibs } from '../lib/lib';

const ROOT_ELEMENT_ID = 'react-siem-root';

const Component = () => {
  const libs: AppFrontendLibs = compose();
  return <div id={ROOT_ELEMENT_ID}>{startApp(libs)}</div>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SiemRootController = ($scope: any, $element: any) => {
  const domNode: Element = $element[0];

  render(<Component />, domNode);

  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
};
