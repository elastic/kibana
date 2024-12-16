/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import { useMemo } from 'react';
import React, { useState } from 'react';
import { EuiPopover, EuiButtonEmpty, EuiPanel } from '@elastic/eui';

import useObservable from 'react-use/lib/useObservable';
import type { RandomSampler } from './random_sampler';
import { randomSamplerText } from './random_sampler';
import { SamplingPanel } from './sampling_panel';

interface Props {
  randomSampler: RandomSampler;
  reload: () => void;
}

export const SamplingMenu: FC<Props> = ({ randomSampler, reload }) => {
  const [showSamplingOptionsPopover, setShowSamplingOptionsPopover] = useState(false);

  const randomSamplerPreference = useObservable(randomSampler.getMode$(), randomSampler.getMode());
  const { buttonText } = useMemo(
    () => randomSamplerText(randomSamplerPreference),
    [randomSamplerPreference]
  );

  return (
    <EuiPopover
      data-test-subj="aiopsRandomSamplerOptionsPopover"
      id="aiopsSamplingOptions"
      button={
        <EuiButtonEmpty
          data-test-subj="aiopsLogPatternAnalysisShowSamplingOptionsButton"
          onClick={() => setShowSamplingOptionsPopover(!showSamplingOptionsPopover)}
          iconSide="right"
          iconType="arrowDown"
        >
          {buttonText}
        </EuiButtonEmpty>
      }
      isOpen={showSamplingOptionsPopover}
      closePopover={() => setShowSamplingOptionsPopover(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiPanel style={{ maxWidth: 400 }}>
        <SamplingPanel randomSampler={randomSampler} reload={reload} />
      </EuiPanel>
    </EuiPopover>
  );
};
