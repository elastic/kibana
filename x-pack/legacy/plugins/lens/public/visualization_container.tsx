/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  isReady?: boolean;
  reportTitle?: string;
}

/**
 * This is a convenience component that wraps rendered Lens visualizations. It adds reporting
 * attributes (data-shared-item, data-render-complete, and data-title).
 */
export function VisualizationContainer({ isReady = true, reportTitle, children, ...rest }: Props) {
  return (
    <div data-shared-item data-render-complete={isReady} data-title={reportTitle} {...rest}>
      {children}
    </div>
  );
}
