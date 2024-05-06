/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { SyntheticsSettingsContext } from '../../../contexts';
import { DslRetentionTab } from './dsl_retention_tab';
import { IlmRetentionTab } from './ilm_retention_tab';

export const DataRetentionTab = () => {
  const { isServerless } = useContext(SyntheticsSettingsContext);

  return isServerless ? <DslRetentionTab /> : <IlmRetentionTab />;
};
