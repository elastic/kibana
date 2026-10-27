/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { RegistryPolicyTemplate } from '../../common/types/models/epm';
import type {
  IacPolicyTemplateSelection,
  RenderIacTemplateIntegration,
} from '../../common/types/rest_spec/iac_provisioner';

import { getPackageInfo } from './epm/packages';
import type { IacProvisionerRenderIntegration } from './iac_provisioner';

export interface IacProvisionerIntegrations {
  integrations: IacProvisionerRenderIntegration[];
}

/**
 * The first policy template or input the package manifest does not declare. The render route
 * turns this into a 400; the key check treats it as "cannot compare".
 */
export interface IacProvisionerIntegrationsBuildError {
  errorMessage: string;
}

export const isBuildError = (
  result: IacProvisionerIntegrations | IacProvisionerIntegrationsBuildError
): result is IacProvisionerIntegrationsBuildError => 'errorMessage' in result;

type PackageResolution = IacProvisionerRenderIntegration | IacProvisionerIntegrationsBuildError;

const isPackageBuildError = (
  resolution: PackageResolution
): resolution is IacProvisionerIntegrationsBuildError => 'errorMessage' in resolution;

interface BuildIacProvisionerIntegrationsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  requestedIntegrations: RenderIacTemplateIntegration[];
}

// Integration packages declare their inputs as `inputs: [{ type }]`; input packages (e.g. the
// OTel CloudWatch collector) declare the single input they collect with as `input: string`.
const getDeclaredInputTypes = (template: RegistryPolicyTemplate): string[] => {
  if ('inputs' in template) {
    return (template.inputs ?? []).map(({ type }) => type);
  }
  if ('input' in template) {
    return [template.input];
  }
  return [];
};

/**
 * Merges duplicate package entries and unions enabledInputs per policy template, then loads each
 * package and validates every requested template and input against the manifest. The package
 * version is taken from the registry so callers do not have to supply it. A package that is not
 * installed or in the registry throws `PackageNotFoundError`; other lookup failures throw as they
 * are. Only the caller's `enabledInputs` are sent: IaCP builds a blueprint patch from every input
 * listed, so anything the user did not enable would over-grant permissions.
 */
export const buildIacProvisionerIntegrations = async ({
  savedObjectsClient,
  requestedIntegrations,
}: BuildIacProvisionerIntegrationsOptions): Promise<
  IacProvisionerIntegrations | IacProvisionerIntegrationsBuildError
> => {
  const templatesByPackage = new Map<string, Map<string, Set<string>>>();
  for (const { name, policyTemplates } of requestedIntegrations) {
    const templates = templatesByPackage.get(name) ?? new Map<string, Set<string>>();
    for (const { name: templateName, enabledInputs } of policyTemplates) {
      const inputs = templates.get(templateName) ?? new Set<string>();
      for (const input of enabledInputs) {
        inputs.add(input);
      }
      templates.set(templateName, inputs);
    }
    templatesByPackage.set(name, templates);
  }

  const resolved = await Promise.all(
    Array.from(
      templatesByPackage,
      async ([pkgName, policyTemplates]): Promise<PackageResolution> => {
        // Empty pkgVersion resolves to the installed version, falling back to
        // the latest available: at connector-creation time the package may not
        // be installed yet. skipArchive: registry info covers everything read
        // here; without it each request downloads and unpacks the archive.
        const packageInfo = await getPackageInfo({
          savedObjectsClient,
          pkgName,
          pkgVersion: '',
          skipArchive: true,
        });

        const resolvedPolicyTemplates: IacPolicyTemplateSelection[] = [];
        for (const [templateName, enabledInputSet] of policyTemplates) {
          const template = (packageInfo.policy_templates ?? []).find(
            ({ name }) => name === templateName
          );
          if (!template) {
            return {
              errorMessage: `${pkgName} has no policy template named ${templateName}`,
            };
          }
          const declaredInputs = new Set(getDeclaredInputTypes(template));
          const enabledInputs = Array.from(enabledInputSet);
          const unknown = enabledInputs.filter((type) => !declaredInputs.has(type));
          if (unknown.length) {
            return {
              errorMessage: `${pkgName} policy template ${templateName} has no inputs named ${unknown.join(
                ', '
              )}`,
            };
          }
          resolvedPolicyTemplates.push({ name: templateName, enabledInputs });
        }

        return {
          name: pkgName,
          version: packageInfo.version,
          policyTemplates: resolvedPolicyTemplates,
        };
      }
    )
  );

  const firstError = resolved.find(isPackageBuildError);
  if (firstError) {
    return firstError;
  }

  return {
    integrations: resolved.filter(
      (resolution): resolution is IacProvisionerRenderIntegration =>
        !isPackageBuildError(resolution)
    ),
  };
};
