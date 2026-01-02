/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

/**
 * Lightweight @elastic/charts replacement for JSDOM tests.
 *
 * Goals:
 * - Avoid RAF (requestAnimationFrame) open-handle leaks in Jest.
 * - Provide stub exports for the chart components used by Watcher.
 */
export const AnnotationDomainType = { YDomain: 'YDomain' };
export const Axis = () => null;
export const Chart = ({ children }: { children?: React.ReactNode }) => (
  <div data-test-subj="mockChart">{children}</div>
);
export const LegendValue = { CurrentAndLastValue: 'CurrentAndLastValue' };
export const LineAnnotation = () => null;
export const LineSeries = () => null;
export const Position = { Bottom: 'Bottom', Left: 'Left' };
export const ScaleType = { Time: 'Time', Linear: 'Linear' };
export const Settings = () => null;
