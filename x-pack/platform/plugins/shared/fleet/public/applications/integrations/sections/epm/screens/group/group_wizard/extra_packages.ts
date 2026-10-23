/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: extra packages of a pick-any schema (CrowdStrike: crowdstrike + ti_crowdstrike, both
// ECS). The first selected package runs the stock create-package-policy hook (useOnSubmit); every
// other selected package gets its package policy built here from the same stock helpers, and is
// saved after the first one, on the same agent policy. Each package is its own package policy.

import { useEffect, useMemo, useState } from 'react';
import { validateAgentConditionExpression } from '@kbn/elastic-agent-condition-language';

import type { NewPackagePolicy, PackageInfo, PackagePolicy } from '../../../../../../../types';
import {
  sendCreatePackagePolicyForRq,
  sendGetPackagePolicies,
  sendInstallPackage,
} from '../../../../../../../hooks';
import { useSpaceSettingsContext } from '../../../../../../../hooks/use_space_settings_context';
import { packageToPackagePolicy, useYaml } from '../../../../../../../services';
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../../../../../../common/constants';
import { getMaxPackageName } from '../../../../../../../../common/services';
import type { PackagePolicyValidationResults } from '../../../../../../../../common/services';
import { validatePackagePolicy } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/services';

import type { SchemaModel, SchemaState } from './model';
import { applySchemaState } from './model';

export interface ExtraPackageInput {
  packageName: string;
  packageInfo?: PackageInfo;
  model?: SchemaModel;
  state: SchemaState;
}

export interface ExtraPackagePolicy extends ExtraPackageInput {
  packagePolicy?: NewPackagePolicy;
  validationResults?: PackagePolicyValidationResults;
}

/** Package policies (with wizard state applied) + validation for the extra packages. */
export const useExtraPackagePolicies = (
  extras: ExtraPackageInput[],
  namespace?: string
): ExtraPackagePolicy[] => {
  const yaml = useYaml();
  const spaceSettings = useSpaceSettingsContext();
  // Stock default name (`<package>-<n>`), from the package's existing package policies.
  const [names, setNames] = useState<Record<string, string>>({});
  const missingNames = extras
    .filter((e) => e.packageInfo && !names[e.packageName])
    .map((e) => e.packageName)
    .join(',');
  useEffect(() => {
    if (!missingNames) return;
    missingNames.split(',').forEach((pkgName) =>
      sendGetPackagePolicies({
        perPage: SO_SEARCH_LIMIT,
        page: 1,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
      }).then(({ data }) =>
        setNames((prev) => ({ ...prev, [pkgName]: getMaxPackageName(pkgName, data?.items) }))
      )
    );
  }, [missingNames]);

  return useMemo(
    () =>
      extras.map((extra) => {
        const name = names[extra.packageName];
        if (!extra.packageInfo || !extra.model || !name) return extra;
        const base = packageToPackagePolicy(extra.packageInfo, [], namespace ?? '', name);
        const packagePolicy = {
          ...base,
          ...applySchemaState(base, extra.model, extra.state),
        };
        const validationResults = yaml
          ? validatePackagePolicy(
              packagePolicy,
              extra.packageInfo,
              { safeLoadYaml: yaml.parse, conditionValidator: validateAgentConditionExpression },
              spaceSettings
            )
          : undefined;
        return { ...extra, packagePolicy, validationResults };
      }),
    [extras, names, namespace, yaml, spaceSettings]
  );
};

/**
 * Saves the extra packages' package policies on the agent policies of the first package's saved
 * policy. Installs each package first (content per the wizard's "Install content", unless it's
 * already installed).
 */
export const saveExtraPackagePolicies = async (
  extras: ExtraPackagePolicy[],
  policyIds: string[],
  installContent: boolean
): Promise<{ saved: PackagePolicy[]; errors: Array<{ packageName: string; message: string }> }> => {
  const saved: PackagePolicy[] = [];
  const errors: Array<{ packageName: string; message: string }> = [];
  for (const extra of extras) {
    if (!extra.packageInfo || !extra.packagePolicy) continue;
    try {
      const installation =
        'installationInfo' in extra.packageInfo ? extra.packageInfo.installationInfo : undefined;
      if (installation?.install_status !== 'installed') {
        const res = await sendInstallPackage(
          extra.packageInfo.name,
          extra.packageInfo.version,
          false,
          { skipKibanaAssets: !installContent }
        );
        if (res.error) throw new Error(res.error.message);
      }
      const { item } = await sendCreatePackagePolicyForRq({
        ...extra.packagePolicy,
        policy_ids: policyIds,
      });
      saved.push(item);
    } catch (err) {
      errors.push({ packageName: extra.packageName, message: err?.message ?? String(err) });
    }
  }
  return { saved, errors };
};
