/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PackagePolicyOutputSelect, useOutputs } from '@kbn/fleet-plugin/public';

interface OutputFieldProps {
  /** The chosen output id. Empty is the output inherited from the agent policy. */
  value: string;
  onChange: (outputId: string) => void;
  /** Package of the policies the output applies to, which limits the output types on offer. */
  packageName: string;
}

/**
 * Picks the output the integration's data goes to, as Fleet's Add integration does. Renders
 * nothing where per-integration outputs are unavailable (below the license Fleet requires).
 */
export function OutputField({ value, onChange, packageName }: OutputFieldProps) {
  const { isLoading, canUseOutputPerIntegration, allowedOutputs, inheritedOutputName } = useOutputs(
    {},
    packageName
  );

  if (!canUseOutputPerIntegration) return null;

  return (
    <PackagePolicyOutputSelect
      fullWidth
      compressed
      outputId={value}
      onChange={(outputId) => onChange(outputId ?? '')}
      allowedOutputs={allowedOutputs}
      inheritedOutputName={inheritedOutputName}
      isLoading={isLoading}
      data-test-subj="sharedSettingsOutput"
    />
  );
}
