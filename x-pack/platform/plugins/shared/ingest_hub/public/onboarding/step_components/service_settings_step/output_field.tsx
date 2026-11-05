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
   * Whether `inputTypes` is complete: the services map and the manifests of every selected service
   * have loaded. Until then the accepted output types are not known.
   */
  areInputTypesLoaded: boolean;
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
  areInputTypesLoaded,
  isInheritedOutputDefault,
}: OutputFieldProps) {
  const packagePolicy = useMemo(
    () => ({ inputs: inputTypes.map((type) => ({ type, enabled: true })) }),
    [inputTypes]
  );
  const {
    isLoading,
    canUseOutputPerIntegration,
    isLicenseKnown,
    allowedOutputs,
    inheritedOutputName,
  } = useOutputs(packagePolicy, packageName);

  // A chosen output the selected services no longer accept (an OTel service added after Logstash
  // was picked, or an output deleted in Fleet) falls back to the inherited one, as Fleet would
  // reject the deploy. Only once both sides are known: the outputs (an empty list means they have
  // not loaded) and the input types, which without the manifests would allow only Beats outputs
  // and clear a valid OTLP choice.
  useEffect(() => {
    if (
      value &&
      areInputTypesLoaded &&
      allowedOutputs.length > 0 &&
      !allowedOutputs.some(({ id }) => id === value)
    ) {
      onChange('');
    }
  }, [value, areInputTypesLoaded, allowedOutputs, onChange]);

  // Below the license Fleet requires, the field is hidden and a stored output (kept from an
  // earlier session, before a license downgrade) could not be reset, while Fleet rejects every
  // deploy that sends it. Only once the license is known: `canUseOutputPerIntegration` is also
  // false while it has not been received, which must not erase the choice of an enterprise user.
  useEffect(() => {
    if (value && isLicenseKnown && !canUseOutputPerIntegration) {
      onChange('');
    }
  }, [value, isLicenseKnown, canUseOutputPerIntegration, onChange]);

  if (!canUseOutputPerIntegration) return null;

  return (
    <PackagePolicyOutputSelect
      fullWidth
      compressed
      helpTextAsTooltip
      outputId={value}
      onChange={(outputId) => onChange(outputId ?? '')}
      allowedOutputs={allowedOutputs}
      inheritedOutputName={isInheritedOutputDefault ? inheritedOutputName : undefined}
      isLoading={isLoading}
      data-test-subj="sharedSettingsOutput"
    />
  );
}
