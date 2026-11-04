/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { PackagePolicyOutputSelect, useOutputs } from '@kbn/fleet-plugin/public';

export interface OutputFieldProps {
  /** The chosen output id. Empty is the output inherited from the agent policy. */
  value: string;
  onChange: (outputId: string) => void;
  /** Package of the policies the output applies to. */
  packageName: string;
  /**
   * Input types of every selected service. One output applies to all their policies, so it must
   * be one each policy accepts: OTel-only inputs allow OTLP, Beats inputs allow Logstash and
   * Kafka, and a mix of both allows only the outputs common to the two.
   */
  inputTypes: string[];
  /**
   * Whether the inherited output is the Fleet default, as for a new agent policy. Existing agent
   * policies may set their own, which is not known here, so the inherited option is not named.
   */
  isInheritedOutputDefault: boolean;
}

/**
 * Picks the output the integration's data goes to, as Fleet's Add integration does. Renders
 * nothing where per-integration outputs are unavailable (below the license Fleet requires).
 */
export function OutputField({
  value,
  onChange,
  packageName,
  inputTypes,
  isInheritedOutputDefault,
}: OutputFieldProps) {
  const packagePolicy = useMemo(
    () => ({ inputs: inputTypes.map((type) => ({ type, enabled: true })) }),
    [inputTypes]
  );
  const { isLoading, canUseOutputPerIntegration, allowedOutputs, inheritedOutputName } = useOutputs(
    packagePolicy,
    packageName
  );

  // A chosen output the selected services no longer accept (an OTel service added after Logstash
  // was picked, or an output deleted in Fleet) falls back to the inherited one, as Fleet would
  // reject the deploy. Only once the outputs have loaded: an empty list means they have not.
  useEffect(() => {
    if (value && allowedOutputs.length > 0 && !allowedOutputs.some(({ id }) => id === value)) {
      onChange('');
    }
  }, [value, allowedOutputs, onChange]);

  if (!canUseOutputPerIntegration) return null;

  return (
    <PackagePolicyOutputSelect
      fullWidth
      compressed
      outputId={value}
      onChange={(outputId) => onChange(outputId ?? '')}
      allowedOutputs={allowedOutputs}
      inheritedOutputName={isInheritedOutputDefault ? inheritedOutputName : undefined}
      isLoading={isLoading}
      data-test-subj="sharedSettingsOutput"
    />
  );
}
