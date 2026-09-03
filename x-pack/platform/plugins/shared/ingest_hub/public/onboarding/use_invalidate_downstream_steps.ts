/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';

function serviceSignature(ids: string[]): string {
  return [...ids].sort().join(',');
}

/**
 * Marks downstream steps incomplete whenever the service selection changes.
 * */
export function useInvalidateDownstreamSteps({
  selectedServiceIds,
  downstreamStepIds,
  markStepsIncomplete,
}: {
  selectedServiceIds: string[];
  downstreamStepIds: string[];
  markStepsIncomplete: (stepIds: string[]) => void;
}) {
  const signature = serviceSignature(selectedServiceIds);

  // Seeded with the mount-time signature so rehydrating from session storage
  // on reload is not mistaken for a selection change.
  const previousSignatureRef = useRef(signature);

  useEffect(() => {
    if (previousSignatureRef.current === signature) return;
    previousSignatureRef.current = signature;
    markStepsIncomplete(downstreamStepIds);
  }, [signature, downstreamStepIds, markStepsIncomplete]);
}
