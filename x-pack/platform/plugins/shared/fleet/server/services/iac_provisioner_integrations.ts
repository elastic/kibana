/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type {
  IacPolicyTemplateSelection,
  RenderIacTemplateIntegration,
} from '../../common/types/rest_spec/iac_provisioner';
import { PackageNotFoundError } from '../errors';

import { appContextService } from './app_context';
import { getPackageInfo } from './epm/packages';
import type { IacProvisionerRenderIntegration } from './iac_provisioner';

/**
 * `strict` rejects the first policy template or input the package manifest does not declare
 * (the render route turns that into a 400) and lets a missing package propagate as
 * `PackageNotFoundError` (404). `lenient` drops undeclared templates and inputs instead,
 * reporting them under `dropped` and packages left with nothing to render under `skipped`, so a
 * stale connector never blocks a key comparison.
 */
export type IacProvisionerIntegrationsMode = 'strict' | 'lenient';

export interface IacProvisionerIntegrations {
  integrations: IacProvisionerRenderIntegration[];
  /**
   * Package names left out in `lenient` mode: the package is not installed or in the registry,
   * or its manifest declares none of the requested policy templates (or none of their enabled
   * inputs). Always empty in `strict` mode.
   */
  skipped: string[];
  /**
   * Undeclared entries removed in `lenient` mode, whether or not their package survived:
   * `pkg/template` for a policy template the manifest does not declare and
   * `pkg/template/input` for an enabled input the template does not declare. Always empty in
   * `strict` mode, where the first such entry is a build error instead.
   */
  dropped: string[];
}

export interface IacProvisionerIntegrationsBuildError {
  errorMessage: string;
}

export const isBuildError = (
  result: IacProvisionerIntegrations | IacProvisionerIntegrationsBuildError
): result is IacProvisionerIntegrationsBuildError => 'errorMessage' in result;

type PackageResolution =
  | { integration: IacProvisionerRenderIntegration; dropped: string[] }
  | { skipped: string; dropped: string[] }
  | IacProvisionerIntegrationsBuildError;

const isPackageBuildError = (
  resolution: PackageResolution
): resolution is IacProvisionerIntegrationsBuildError => 'errorMessage' in resolution;

interface BuildIacProvisionerIntegrationsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  requestedIntegrations: RenderIacTemplateIntegration[];
  mode: IacProvisionerIntegrationsMode;
}

/**
 * Merges duplicate package entries and unions enabledInputs per policy
 * template, then loads each package and validates every requested template
 * and input against the manifest — rejecting or dropping the unknown ones
 * according to `mode`. The package version is taken from the registry so
 * callers do not have to supply it. Only the caller's `enabledInputs` are
 * sent: IaCP builds a blueprint patch from every input listed, so anything
 * the user did not enable would over-grant permissions.
 */
export async function buildIacProvisionerIntegrations(
  options: BuildIacProvisionerIntegrationsOptions & { mode: 'lenient' }
): Promise<IacProvisionerIntegrations>;
export async function buildIacProvisionerIntegrations(
  options: BuildIacProvisionerIntegrationsOptions & { mode: 'strict' }
): Promise<IacProvisionerIntegrations | IacProvisionerIntegrationsBuildError>;
export async function buildIacProvisionerIntegrations({
  savedObjectsClient,
  requestedIntegrations,
  mode,
}: BuildIacProvisionerIntegrationsOptions): Promise<
  IacProvisionerIntegrations | IacProvisionerIntegrationsBuildError
> {
  const logger = appContextService.getLogger().get('IacProvisionerIntegrations');
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
        let packageInfo: Awaited<ReturnType<typeof getPackageInfo>>;
        try {
          // Empty pkgVersion resolves to the installed version, falling back to
          // the latest available: at connector-creation time the package may not
          // be installed yet. skipArchive: registry info covers everything read
          // here; without it each request downloads and unpacks the archive.
          packageInfo = await getPackageInfo({
            savedObjectsClient,
            pkgName,
            pkgVersion: '',
            skipArchive: true,
          });
        } catch (error) {
          // Only "not found" is a fact about the connector's packages; registry or
          // network failures still propagate so callers can fail open on them.
          if (mode === 'lenient' && error instanceof PackageNotFoundError) {
            logger.debug(`Skipped ${pkgName}: not installed or found in registry`);
            return { skipped: pkgName, dropped: [] };
          }
          throw error;
        }

        const resolvedPolicyTemplates: IacPolicyTemplateSelection[] = [];
        const droppedTemplates: string[] = [];
        const droppedInputs: string[] = [];
        for (const [templateName, enabledInputSet] of policyTemplates) {
          const template = (packageInfo.policy_templates ?? []).find(
            ({ name }) => name === templateName
          );
          if (!template) {
            if (mode === 'strict') {
              return {
                errorMessage: `${pkgName} has no policy template named ${templateName}`,
              };
            }
            droppedTemplates.push(templateName);
            continue;
          }
          const inputs = 'inputs' in template ? template.inputs ?? [] : [];
          const declaredInputs = new Set(inputs.map(({ type }) => type));
          const enabledInputs = Array.from(enabledInputSet);
          const unknown = enabledInputs.filter((type) => !declaredInputs.has(type));
          if (unknown.length) {
            if (mode === 'strict') {
              return {
                errorMessage: `${pkgName} policy template ${templateName} has no inputs named ${unknown.join(
                  ', '
                )}`,
              };
            }
            droppedInputs.push(...unknown.map((type) => `${templateName}/${type}`));
          }
          const declared = enabledInputs.filter((type) => declaredInputs.has(type));
          if (mode === 'lenient' && declared.length === 0) {
            // Every enabled input was undeclared (the request schema guarantees at least one),
            // so there is nothing left for IaCP to render from this template.
            continue;
          }
          resolvedPolicyTemplates.push({ name: templateName, enabledInputs: declared });
        }

        const dropped = [...droppedTemplates, ...droppedInputs].map(
          (entry) => `${pkgName}/${entry}`
        );
        if (dropped.length > 0) {
          // The rendered template would cover less than the user enabled; warn so the
          // package/version mismatch is visible in the logs.
          const parts = [
            droppedTemplates.length > 0 && `policy templates ${droppedTemplates.join(', ')}`,
            droppedInputs.length > 0 && `inputs ${droppedInputs.join(', ')}`,
          ].filter(Boolean);
          logger.warn(
            `Dropped from ${pkgName}@${
              packageInfo.version
            }, not declared by the manifest: ${parts.join('; ')}`
          );
        }

        if (mode === 'lenient' && resolvedPolicyTemplates.length === 0) {
          logger.debug(
            `Skipped ${pkgName}@${packageInfo.version}: manifest declares none of the requested policy templates or inputs`
          );
          return { skipped: pkgName, dropped };
        }

        return {
          integration: {
            name: pkgName,
            version: packageInfo.version,
            policyTemplates: resolvedPolicyTemplates,
          },
          dropped,
        };
      }
    )
  );

  const firstError = resolved.find(isPackageBuildError);
  if (firstError) {
    return firstError;
  }

  const result: IacProvisionerIntegrations = { integrations: [], skipped: [], dropped: [] };
  for (const resolution of resolved) {
    if (isPackageBuildError(resolution)) {
      continue;
    }
    result.dropped.push(...resolution.dropped);
    if ('integration' in resolution) {
      result.integrations.push(resolution.integration);
    } else {
      result.skipped.push(resolution.skipped);
    }
  }
  return result;
}
