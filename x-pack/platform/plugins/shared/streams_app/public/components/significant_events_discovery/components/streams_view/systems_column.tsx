/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { useStreamSystems } from '../../../stream_detail_systems/stream_systems/hooks/use_stream_systems';

interface SystemsColumnProps {
  streamName: string;
}

export function SystemsColumn({ streamName }: SystemsColumnProps) {
  const { systems } = useStreamSystems(streamName);

  return (
    <EuiText
      size="s"
      className={css`
        text-align: center;
        font-family: 'Roboto Mono', monospace;
      `}
    >
      {systems.length || '—'}
    </EuiText>
  );
}
