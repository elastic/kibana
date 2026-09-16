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
  const serviceVars: ServiceVars = stored ?? {
    enabledDataStreams: service.dataStreams.length > 0 ? service.dataStreams : [service.id],
    varsByDataStream: {},
  };

  const inputs = new Set<string>();
  const activeDataStreams =
    serviceVars.enabledDataStreams.length > 0
      ? serviceVars.enabledDataStreams
      : service.dataStreams.length > 0
      ? service.dataStreams
      : [service.id];

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

/**
 * Builds the IaC Provisioner `integrations` payload for Ingest Hub's Launch
 * CloudFormation button: one entry per package, with each selected managed
 * integration's policy template and the inputs the user actually enabled.
 */
export const getIacRenderIntegrations = (
  serviceIds: string[],
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined,
  serviceVars: Record<string, ServiceVars>
): RenderIacTemplateIntegration[] => {
  const templatesByPackage = new Map<string, Map<string, Set<string>>>();

  for (const serviceId of serviceIds) {
    const service = awsServicesMap?.get(serviceId);
    if (!service || service.identityFederationSupported === false) {
      continue;
    }

    const enabledInputs = getActiveInputs(service, serviceVars[serviceId]);
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
