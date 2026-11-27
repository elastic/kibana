/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';

/** Whether the frame the component first rendered in has been painted. */
export const useHasPainted = (): boolean => {
  const [hasPainted, setHasPainted] = useState(false);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // A timeout queued from an animation frame runs once that frame has painted.
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => setHasPainted(true), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, []);
  return hasPainted;
};

const DEFAULT_FALLBACK = (
  <EuiFlexGroup justifyContent="center" responsive={false} data-test-subj="streamsDeferredMount">
    <EuiLoadingSpinner size="m" />
  </EuiFlexGroup>
);

/**
 * Renders `fallback` first and `children` after the next paint, so the container
 * opening (a flyout or an expanded row) is never held up by expensive content.
 */
export const DeferredMount = ({
  children,
  fallback = DEFAULT_FALLBACK,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  const hasPainted = useHasPainted();
  return <>{hasPainted ? children : fallback}</>;
};
