/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiHorizontalRule, EuiSwitch } from '@elastic/eui';
import { useExternalEmbedState, setAutoplay, setAutoplayInterval } from '../../../context';
import { createTimeInterval } from '../../../../public/lib/time_interval';
// @ts-ignore Untyped local
import { CustomInterval } from '../../../../public/components/workpad_header/control_settings/custom_interval';

/**
 * The panel used to configure Autolay in Embedded Workpads.
 */
export const AutoplaySettings = () => {
  const [{ settings }, dispatch] = useExternalEmbedState();

  const { autoplay } = settings;

  return (
    <div style={{ padding: 16 }}>
      <EuiSwitch
        name="cycle"
        id="cycle"
        label="Cycle Slides"
        checked={autoplay.enabled}
        onChange={() => dispatch(setAutoplay(!autoplay.enabled))}
      />
      <EuiHorizontalRule margin="m" />
      <CustomInterval
        defaultValue={autoplay.interval}
        onSubmit={(value: number) => dispatch(setAutoplayInterval(createTimeInterval(value)))}
      />
    </div>
  );
};
