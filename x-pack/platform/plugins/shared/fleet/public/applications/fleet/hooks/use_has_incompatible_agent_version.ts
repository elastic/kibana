/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import satisfies from 'semver/functions/satisfies';

import type { AgentPolicy } from '../types';
import type { PackageInfo } from '../../../../common/types';

export type IncompatibleAgentVersionStatus = 'NONE' | 'SOME' | 'ALL';

export const useHasIncompatibleAgentVersion = (
  packageInfo: PackageInfo | undefined,
  agentPolicies: AgentPolicy[] | undefined
): IncompatibleAgentVersionStatus => {
  return useMemo(() => {
    return getIncompatibleAgentVersionStatus(packageInfo, agentPolicies);
  }, [packageInfo, agentPolicies]);
};

export const getIncompatibleAgentVersionStatus = (
  packageInfo: PackageInfo | undefined,
  agentPolicies: AgentPolicy[] | undefined
): IncompatibleAgentVersionStatus => {
  const versionCondition = packageInfo?.conditions?.agent?.version;
  if (!versionCondition) {
    return 'NONE';
  }
  return (agentPolicies ?? []).reduce<IncompatibleAgentVersionStatus>((acc, agentPolicy) => {
    if (acc === 'SOME') return acc;
    const { agents_per_version: agentPerVersion } = agentPolicy;
    if (!agentPerVersion) {
      return acc;
    }
    const hasAllIncompatible = agentPerVersion.every(
      (entry) => !satisfies(entry.version, versionCondition)
    );
    const hasSomeIncompatible = agentPerVersion.some(
      (entry) => !satisfies(entry.version, versionCondition)
    );
    return hasAllIncompatible ? 'ALL' : hasSomeIncompatible ? 'SOME' : acc;
  }, 'NONE');
};
