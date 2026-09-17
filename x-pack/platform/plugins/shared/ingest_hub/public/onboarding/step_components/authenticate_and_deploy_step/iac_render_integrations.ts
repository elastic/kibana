/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderIacTemplateIntegration } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceVars } from '../service_settings_step/use_service_settings';

const getActiveInputs = (
  service: AwsServiceMatrixEntry,
  stored: ServiceVars | undefined
): string[] => {
  // A stored empty selection is the user explicitly disabling every data
  // stream (see useServiceSettings) — contribute no inputs. Only an absent
  // value falls back to the service defaults.
  if (stored && stored.enabledDataStreams.length === 0) {
    return [];
  }
  const serviceVars: ServiceVars = stored ?? {
    enabledDataStreams: service.dataStreams.length > 0 ? service.dataStreams : [service.id],
    varsByDataStream: {},
  };

  const inputs = new Set<string>();
  const activeDataStreams = serviceVars.enabledDataStreams;

  for (const dsId of activeDataStreams) {
    const dsInfo = service.varDefsByDataStream?.[dsId];
    const dsVars = serviceVars.varsByDataStream[dsId] ?? { enabledInputs: [], varsByInput: {} };
    const isSingleDs = (service.dataStreams.length || 1) === 1;
    const activeInputs = dsVars.enabledInputs.length
      ? dsVars.enabledInputs
      : isSingleDs
      ? dsInfo?.inputs ?? service.inputs ?? service.defaultEnabledInputs ?? []
      : dsInfo?.defaultEnabledInputs?.length
      ? dsInfo.defaultEnabledInputs
      : dsInfo?.inputs?.length
      ? dsInfo.inputs.slice(0, 1)
      : service.defaultEnabledInputs?.length
      ? service.defaultEnabledInputs.slice(0, 1)
      : (service.inputs ?? []).slice(0, 1);

    for (const input of activeInputs) {
      inputs.add(input);
    }
  }

  return [...inputs];
};

export interface IacInstanceSelection {
  /** Service Settings row identity; the key into `serviceVars`. */
  instanceId: string;
  /** Service matrix / policy-template key. Duplicates share it. */
  serviceId: string;
}

/**
 * Builds the IaC Provisioner `integrations` payload for Ingest Hub's Launch
 * CloudFormation button and resolve call: one entry per package, with each
 * selected managed integration's policy template and the inputs the user
 * actually enabled. Callers pass instances (not service ids) so inputs
 * enabled only on a duplicated instance are unioned in too.
 */
export const getIacRenderIntegrations = (
  instances: IacInstanceSelection[],
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined,
  serviceVars: Record<string, ServiceVars>
): RenderIacTemplateIntegration[] => {
  const templatesByPackage = new Map<string, Map<string, Set<string>>>();

  for (const { instanceId, serviceId } of instances) {
    const service = awsServicesMap?.get(serviceId);
    if (!service || service.identityFederationSupported === false) {
      continue;
    }

    const enabledInputs = getActiveInputs(service, serviceVars[instanceId]);
    if (enabledInputs.length === 0) {
      continue;
    }

    const packageName = service.packageName;
    const templateName = service.policyTemplate ?? service.id;
    const templates = templatesByPackage.get(packageName) ?? new Map<string, Set<string>>();
    const inputs = templates.get(templateName) ?? new Set<string>();
    for (const input of enabledInputs) {
      inputs.add(input);
    }
    templates.set(templateName, inputs);
    templatesByPackage.set(packageName, templates);
  }

  return Array.from(templatesByPackage, ([name, templates]) => ({
    name,
    policyTemplates: Array.from(templates, ([templateName, inputs]) => ({
      name: templateName,
      enabledInputs: [...inputs],
    })),
  }));
};
