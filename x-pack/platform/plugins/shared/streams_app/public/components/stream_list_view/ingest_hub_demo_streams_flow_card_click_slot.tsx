/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import React, { useCallback } from 'react';

export interface IngestHubDemoStreamsFlowCardClickSlotProps {
  readonly nodeId: string;
  readonly ariaLabel: string;
  readonly style: CSSProperties;
  readonly onActivate: () => void;
  readonly onMouseEnter?: () => void;
  readonly children: ReactNode;
}

export function IngestHubDemoStreamsFlowCardClickSlot({
  nodeId,
  ariaLabel,
  style,
  onActivate,
  onMouseEnter,
  children,
}: IngestHubDemoStreamsFlowCardClickSlotProps) {
  const onClick = useCallback(() => {
    onActivate();
  }, [onActivate]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate();
      }
    },
    [onActivate]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      style={{ ...style, cursor: 'pointer' }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      data-test-subj={`streamsFlowCanvasCard-${nodeId}`}
    >
      {children}
    </div>
  );
}
