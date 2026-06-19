/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';

export const DetectSpotlightDetail = () => (
  <p>
    Rules are ES|QL-first: you choose what to KEEP in <EuiCode>data</EuiCode>, and every evaluation
    writes an immutable rule event to <EuiCode>.rule-events-*</EuiCode>. Episodes group lifecycle
    (inactive → pending → active → recovering → inactive) so you investigate with full context
    in Discover, not overwritten v1 alert documents.
  </p>
);

export const RespondSpotlightDetail = () => (
  <p>
    Action policies replace scattered per-action knobs. The dispatcher matches episodes, groups on{' '}
    <EuiCode>data.*</EuiCode>, throttles per series, and hands off to Workflows for multi-step
    response. Snooze a group without stopping detection.
  </p>
);

export const SPOTLIGHT_DETAIL_BY_ID: Record<string, React.ReactNode> = {
  detect: <DetectSpotlightDetail />,
  respond: <RespondSpotlightDetail />,
};
