/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiHorizontalRule, EuiSwitch } from '@elastic/eui';
import { createTimeInterval } from '../../../../public/lib/time_interval';
// @ts-ignore Untyped local
import { CustomInterval } from '../../../../public/components/workpad_header/control_settings/custom_interval';

export type onSetAutoplayProp = (autoplay: boolean) => void;
export type onSetIntervalProp = (interval: string) => void;

export interface Props {
  /**
   * True if autoplay is currently enabled, false otherwise.
   */
  isEnabled: boolean;

  /**
   * The interval with which to move between pages.
   */
  interval: string;

  /**
   * The handler to invoke when Autoplay is enabled or disabled.
   */
  onSetAutoplay: onSetAutoplayProp;

  /**
   * The handler to invoke when the autoplay interval is set.
   */
  onSetInterval: onSetIntervalProp;
}

/**
 * The panel used to configure Autolay in Shareable Canvas Workpads.
 */
export const AutoplaySettings = ({ isEnabled, interval, onSetAutoplay, onSetInterval }: Props) => (
  <div style={{ padding: 16 }}>
    <EuiSwitch
      name="cycle"
      id="cycle"
      label="Cycle Slides"
      checked={isEnabled}
      onChange={() => onSetAutoplay(!isEnabled)}
    />
    <EuiHorizontalRule margin="m" />
    <CustomInterval
      defaultValue={interval}
      onSubmit={(value: number) => onSetInterval(createTimeInterval(value))}
    />
  </div>
);
