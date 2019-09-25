/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  useCanvasShareableState,
  setAutoplayAction,
  setAutoplayIntervalAction,
} from '../../../context';

import { AutoplaySettings, onSetAutoplayProp, onSetIntervalProp } from './autoplay_settings';

/**
 * A store-connected container for the `AutoplaySettings` component.
 */
export const AutoplaySettingsContainer = () => {
  const [{ settings }, dispatch] = useCanvasShareableState();

  const { autoplay } = settings;
  const { isEnabled, interval } = autoplay;

  const onSetInterval: onSetIntervalProp = (newInterval: string) =>
    dispatch(setAutoplayIntervalAction(newInterval));

  const onSetAutoplay: onSetAutoplayProp = (enabled: boolean) =>
    dispatch(setAutoplayAction(enabled));

  return <AutoplaySettings {...{ isEnabled, interval, onSetAutoplay, onSetInterval }} />;
};
