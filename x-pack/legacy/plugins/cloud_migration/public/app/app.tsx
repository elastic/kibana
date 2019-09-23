/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { useCore } from './app_context';

export const App = () => {
  const {
    api: { cluster },
  } = useCore();

  const { data, error, isLoading } = cluster.state.get();

  // console.log('DATA', data, 'ERROR', error, 'IS LOADING', isLoading);
  return <h1>Cloud migration Plugin!...</h1>;
};
