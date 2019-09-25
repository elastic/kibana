/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useCanvasShareableState } from '../../../context';
import { Settings } from './settings';

/**
 * A store-connected container for the `Settings` component.
 */
export const SettingsContainer = () => {
  const [{ refs }] = useCanvasShareableState();

  return <Settings refs={refs} />;
};
