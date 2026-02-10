/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import type { OnboardingResult, Streams, TaskResult } from '@kbn/streams-schema';
import React from 'react';
import { useStreamFeatures } from '../../../../hooks/use_stream_features';

interface FeaturesColumnProps {
  stream: Streams.all.Definition;
  streamOnboardingResult?: TaskResult<OnboardingResult>;
}

export function FeaturesColumn({ stream, streamOnboardingResult }: FeaturesColumnProps) {
  const { features } = useStreamFeatures(stream, [streamOnboardingResult]);

  return (
    <EuiText
      size="s"
      className={css`
        text-align: center;
        font-family: 'Roboto Mono', monospace;
      `}
    >
      {features.length || '—'}
    </EuiText>
  );
}
