/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Page } from '../../components';

// eslint-disable-next-line
export interface Props {}

export const App: React.FC<Props> = () => {
  return <Page title={'Tags examples'}>Hello world</Page>;
};
