/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  useExternalEmbedState,
  setAutoplayAction,
  setAutoplayIntervalAction,
} from '../../../context';

import {
  AutoplaySettings as AutoplaySettingsComponent,
  onSetAutoplayProp,
  onSetIntervalProp,
} from './autoplay_settings';

/**
 * The panel used to configure Autolay in Embedded Workpads.
 */
export const AutoplaySettings = () => {
  const [{ settings }, dispatch] = useExternalEmbedState();

  const { autoplay } = settings;
  const { isEnabled, interval } = autoplay;

  const onSetInterval: onSetIntervalProp = (newInterval: string) =>
    dispatch(setAutoplayIntervalAction(newInterval));

  const onSetAutoplay: onSetAutoplayProp = (enabled: boolean) =>
    dispatch(setAutoplayAction(enabled));

  return <AutoplaySettingsComponent {...{ isEnabled, interval, onSetAutoplay, onSetInterval }} />;
};
