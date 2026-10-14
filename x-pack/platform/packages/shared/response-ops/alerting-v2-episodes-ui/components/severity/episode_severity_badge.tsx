/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { useSeverityRegistry } from '../../hooks/use_severity_registry';

export interface AlertEpisodeSeverityBadgeProps {
  severity: string | undefined | null;
}

export const AlertEpisodeSeverityBadge = ({ severity }: AlertEpisodeSeverityBadgeProps) => {
  const { registryMap } = useSeverityRegistry();

  if (severity == null) {
    return null;
  }

  const entry = registryMap.get(severity.toLowerCase());
  if (!entry) {
    return null;
  }

  return (
    <EuiBadge
      color={entry.color}
      fill
      data-test-subj={`alertingV2EpisodeSeverityBadge-${entry.value}`}
    >
      {entry.label}
    </EuiBadge>
  );
};
