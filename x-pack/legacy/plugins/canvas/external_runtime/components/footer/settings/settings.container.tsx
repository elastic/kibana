/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState } from '../../../context';
import { Settings as SettingsComponent } from './settings';
/**
 * The Settings Popover for External Workpads.
 */
export const Settings = () => {
  const [{ refs }] = useExternalEmbedState();

  return <SettingsComponent refs={refs} />;
};
