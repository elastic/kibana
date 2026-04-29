/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { StateProvider } from './mappings_state_context';
import { ConfigProvider } from './config_context';

export const MappingsEditorProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <StateProvider>
      <ConfigProvider>{children}</ConfigProvider>
    </StateProvider>
  );
};
