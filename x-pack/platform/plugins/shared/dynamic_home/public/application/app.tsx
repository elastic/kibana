/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HttpStart } from '@kbn/core/public';
import { DynamicHomePage } from './components/dynamic_home_page';

interface AppProps {
  http: HttpStart;
}

export const App: React.FC<AppProps> = ({ http }) => {
  return <DynamicHomePage http={http} />;
};
