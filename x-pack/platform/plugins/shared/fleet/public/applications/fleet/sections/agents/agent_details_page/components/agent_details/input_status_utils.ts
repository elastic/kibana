/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type {
  FleetServerAgentComponent,
  FleetServerAgentComponentStatus,
  FleetServerAgentComponentUnit,
} from '../../../../../../../../common/types/models/agent';
export class InputStatusFormatter {
  public status?: FleetServerAgentComponentStatus;
  public description?: string;
  public hasError?: boolean;

  constructor(status?: FleetServerAgentComponentStatus, message?: string) {
    this.status = status;
    this.description =
      message ||
      i18n.translate('xpack.fleet.agentDetailsIntegrations.inputStatusDefaultDescription', {
        defaultMessage: 'Not available',
      });
    this.hasError = status === 'FAILED' || status === 'DEGRADED';
  }

  getErrorTitleFromStatus(): string | undefined {
    switch (this.status) {
      case 'FAILED':
        return i18n.translate('xpack.fleet.agentDetailsIntegrations.inputErrorTitle.failed', {
          defaultMessage: 'Failed',
        });
      case 'DEGRADED':
        return i18n.translate('xpack.fleet.agentDetailsIntegrations.inputErrorTitle.degraded', {
          defaultMessage: 'Degraded',
        });
      default:
        return;
    }
  }
}

export const getInputUnitsByPackage = (
  agentComponents: FleetServerAgentComponent[],
  inputOrPackagePolicyId: string
): FleetServerAgentComponentUnit[] => {
  const re = new RegExp(inputOrPackagePolicyId);

  return agentComponents
    .map((c) => c?.units || [])
    .flat()
    .filter((u) => !!u && u.id.match(re));
};

export const getOutputUnitsByPackage = (
  agentComponents: FleetServerAgentComponent[],
  inputOrPackagePolicyId: string
): FleetServerAgentComponentUnit[] => {
  const reId = new RegExp(inputOrPackagePolicyId);

  return agentComponents
    .filter((c) => (c.units ?? []).some((unit) => unit.id.match(reId)))
    .map((c) => c.units || [])
    .flat()
    .filter((u) => !!u && u.type === 'output');
};

export const getOutputUnitsByPackageAndInputType = (
  agentComponents: FleetServerAgentComponent[],
  inputOrPackagePolicyId: string,
  unitType: string
): FleetServerAgentComponentUnit | undefined => {
  const reId = new RegExp(inputOrPackagePolicyId);
  const reUnitType = new RegExp(unitType);

  return agentComponents
    .filter((c) => (c.units ?? []).some((unit) => unit.id.match(reId) && unit.id.match(reUnitType)))
    .map((c) => c.units || [])
    .flat()
    .find((u) => !!u && u.type === 'output');
};
