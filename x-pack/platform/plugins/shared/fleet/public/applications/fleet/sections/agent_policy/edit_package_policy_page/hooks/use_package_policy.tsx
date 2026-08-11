/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import { omit, pick } from 'lodash';

import { i18n } from '@kbn/i18n';

import { validateAgentConditionExpression } from '@kbn/elastic-agent-condition-language';

import type {
  GetOnePackagePolicyResponse,
  UpgradePackagePolicyDryRunResponse,
} from '../../../../../../../common/types/rest_spec';
import {
  sendBulkGetAgentPolicies,
  sendGetOnePackagePolicy,
  sendGetPackageInfoByKey,
  sendGetSettings,
  sendUpdateAgentlessPolicy,
  sendUpdatePackagePolicy,
  sendUpgradePackagePolicyDryRun,
} from '../../../../hooks';
import type { RequestError } from '../../../../hooks';
import type {
  PackagePolicyConfigRecord,
  UpdatePackagePolicy,
  AgentPolicy,
  NewPackagePolicy,
  PackagePolicy,
  PackageInfo,
} from '../../../../types';
import { toNewAgentlessPolicy } from '../../../../../../../common/services';
import { fetchAgentlessPolicyAsPackagePolicy } from '../../services';
import {
  type PackagePolicyValidationResults,
  validatePackagePolicy,
  validationHasErrors,
} from '../../create_package_policy_page/services';
import type { PackagePolicyFormState } from '../../create_package_policy_page/types';
import { useYaml } from '../../../../../../services';
import { ExperimentalFeaturesService, isAgentlessPoliciesUIEnabled } from '../../../../services';
import { fixApmDurationVars, hasUpgradeAvailable } from '../utils';
import { prepareInputPackagePolicyDataset } from '../../create_package_policy_page/services/prepare_input_pkg_policy_dataset';

function mergeVars(
  packageVars?: PackagePolicyConfigRecord,
  userVars: PackagePolicyConfigRecord = {}
): PackagePolicyConfigRecord {
  if (!packageVars) {
    return {};
  }

  return Object.entries(packageVars).reduce((acc, [varKey, varRecord]) => {
    acc[varKey] = {
      ...varRecord,
      value: userVars?.[varKey]?.value ?? varRecord.value,
    };

    return acc;
  }, {} as PackagePolicyConfigRecord);
}

async function isPreleaseEnabled() {
  const { data: settings } = await sendGetSettings();

  return Boolean(settings?.item.prerelease_integrations_enabled);
}

// Normalizes an unknown catch value into the `{ error }` shape callers expect. Keeps `statusCode`
// when the throw already carried it (real API conflicts still hit the 409 branch in `onSubmit`)
// rather than unsoundly casting to `RequestError` and fabricating that shape for a plain throw.
const toRequestError = (error: unknown): RequestError =>
  error instanceof Error ? error : new Error(String(error));

export function usePackagePolicyWithRelatedData(
  packagePolicyId: string,
  options: {
    forceUpgrade?: boolean;
    // When true, read/write this policy through the agentless API instead of the
    // package-policy/agent-policy APIs. Driven by the edit page's detect-before-read hint.
    isAgentless?: boolean;
  }
) {
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();
  const [packagePolicy, setPackagePolicy] = useState<UpdatePackagePolicy>({
    name: '',
    description: '',
    namespace: '',
    policy_id: '',
    policy_ids: [],
    enabled: true,
    inputs: [],
    version: '',
  });
  const [originalPackagePolicy, setOriginalPackagePolicy] =
    useState<GetOnePackagePolicyResponse['item']>();
  const [agentPolicies, setAgentPolicies] = useState<AgentPolicy[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [dryRunData, setDryRunData] = useState<UpgradePackagePolicyDryRunResponse>();
  const [loadingError, setLoadingError] = useState<Error>();

  const [isUpgrade, setIsUpgrade] = useState<boolean>(options.forceUpgrade ?? false);
  // `options.isAgentless` is a fast-path hint carried by links we control. When it is missing
  // (refresh, deep link, or a foreign entry point) we fall back to detecting agentless from the
  // loaded package policy's own `supports_agentless` flag. That flag is authoritative per policy
  // instance (dual-mode packages route correctly), and it drives the write path so an agentless
  // policy is never saved through the package-policy API.
  // Both inputs are gated on the agentless-policies-UI kill switch: when it is off, this hook
  // ignores the hint (even if a caller passes it) and the detection, so read and write both fall
  // back to the legacy package-policy/agent-policy APIs.
  const agentlessUIEnabled = isAgentlessPoliciesUIEnabled();
  const [detectedAgentless, setDetectedAgentless] = useState(false);
  const isAgentlessOption = agentlessUIEnabled && (options.isAgentless ?? false);
  const isAgentlessPolicy = isAgentlessOption || (agentlessUIEnabled && detectedAgentless);
  const yaml = useYaml();

  // Form state
  const [isEdited, setIsEdited] = useState(false);
  const [formState, setFormState] = useState<PackagePolicyFormState>('INVALID');
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  const savePackagePolicy = async (packagePolicyOverride?: Partial<PackagePolicy>) => {
    setFormState('LOADING');
    // Wrap the whole save  so *every* failure resolves to the `{ data, error }` shape `onSubmit` expects.
    try {
      const {
        policy: { elasticsearch, ...restPackagePolicy },
      } = await prepareInputPackagePolicyDataset(
        omit(
          {
            ...packagePolicy,
            ...(packagePolicyOverride ?? {}),
          },
          'spaceIds'
        )
      );

      // Agentless policies are updated through the agentless API (full-replace PUT), never the
      // package-policy API.
      if (isAgentlessPolicy) {
        // The agentless API has no agent-policy reassignment: `toNewAgentlessPolicy` drops
        // `policy_ids`, so honoring a changed override would report success while saving
        // nothing (e.g. the manage-agent-policies modal). Fail loudly instead. The edit page
        // echoes the unchanged ids on every save, which stays allowed.
        if (
          packagePolicyOverride?.policy_ids &&
          !deepEqual(packagePolicyOverride.policy_ids, packagePolicy.policy_ids)
        ) {
          throw new Error(
            i18n.translate('xpack.fleet.editPackagePolicy.agentlessPolicyReassignmentError', {
              defaultMessage: 'Managed integrations do not support agent policy reassignment.',
            })
          );
        }
        const { enableVarGroups } = ExperimentalFeaturesService.get();
        const varGroups =
          enableVarGroups && packageInfo?.var_groups ? packageInfo.var_groups : undefined;
        const { item } = await sendUpdateAgentlessPolicy(
          packagePolicyId,
          // Pass `packageInfo` so the write-side input/stream allow-check matches the read path
          // (`agentlessPolicyToPackagePolicy`); without it an unedited load→save could flip input
          // enablement for deployment-mode-restricted packages.
          toNewAgentlessPolicy(restPackagePolicy as NewPackagePolicy, varGroups, packageInfo)
        );
        setFormState('SUBMITTED');
        return { data: { item }, error: null };
      }

      const result = await sendUpdatePackagePolicy(packagePolicyId, restPackagePolicy);

      setFormState('SUBMITTED');

      return result;
    } catch (error) {
      setFormState('SUBMITTED');
      return { data: undefined, error: toRequestError(error) };
    }
  };
  // Update package policy validation
  const updatePackagePolicyValidation = useCallback(
    (newPackagePolicy?: UpdatePackagePolicy) => {
      if (packageInfo && yaml) {
        const newValidationResult = validatePackagePolicy(
          newPackagePolicy || packagePolicy,
          packageInfo,
          { safeLoadYaml: yaml.parse, conditionValidator: validateAgentConditionExpression }
        );
        setValidationResults(newValidationResult);
        // eslint-disable-next-line no-console
        console.debug('Package policy validation results', newValidationResult);

        return newValidationResult;
      }
    },
    [packagePolicy, packageInfo, yaml]
  );
  // Update package policy method
  const updatePackagePolicy = useCallback(
    (updatedFields: Partial<UpdatePackagePolicy>) => {
      const isDeepEqual = deepEqual(
        JSON.parse(JSON.stringify(updatedFields)),
        JSON.parse(JSON.stringify(pick(packagePolicy, Object.keys(updatedFields))))
      );

      if (!isDeepEqual) {
        setIsEdited(true);
      }

      const newPackagePolicy = {
        ...packagePolicy,
        ...updatedFields,
      };
      setPackagePolicy(newPackagePolicy);

      // eslint-disable-next-line no-console
      console.debug('Package policy updated', newPackagePolicy);
      const newValidationResults = updatePackagePolicyValidation(newPackagePolicy);
      const hasValidationErrors = newValidationResults
        ? validationHasErrors(newValidationResults)
        : false;
      if (!hasValidationErrors) {
        setFormState('VALID');
      } else {
        setFormState('INVALID');
      }
    },
    [packagePolicy, updatePackagePolicyValidation]
  );

  // Load the package policy and related data
  useEffect(() => {
    // Guards against a race with the agentless loader below (both share `packagePolicy`/
    // `packageInfo`/loading state and both re-run on `isAgentlessOption`). On dep change or
    // unmount the cleanup flips `ignore`, so a superseded/late-resolving request from this run
    // never overwrites state committed by the newer run.
    let ignore = false;
    const getData = async () => {
      // Agentless policies are loaded by the dedicated effect below, through the agentless API.
      if (isAgentlessOption) {
        return;
      }
      setIsLoadingData(true);
      setLoadingError(undefined);
      try {
        const prerelease = await isPreleaseEnabled();

        const { data: packagePolicyData, error: packagePolicyError } =
          await sendGetOnePackagePolicy(packagePolicyId);

        if (packagePolicyError) {
          throw packagePolicyError;
        }

        if (ignore) {
          return;
        }

        // Detect an agentless policy that was opened without the `isAgentless` hint, so the save
        // routes through the agentless API rather than the package-policy API. Set (not just
        // raised) on every load: this hook can re-run with a different `packagePolicyId` without
        // a remount, and a stale `true` from a previously loaded agentless policy would route the
        // next policy's save through the agentless PUT, which the server rejects.
        const isAgentlessInstance = Boolean(packagePolicyData?.item?.supports_agentless);
        setDetectedAgentless(isAgentlessInstance);

        if (packagePolicyData!.item.policy_ids && packagePolicyData!.item.policy_ids.length > 0) {
          const { data, error: agentPolicyError } = await sendBulkGetAgentPolicies(
            packagePolicyData!.item.policy_ids
          );

          if (agentPolicyError) {
            throw agentPolicyError;
          }

          if (ignore) {
            return;
          }

          setAgentPolicies(data?.items ?? []);
        }

        // Skip the legacy upgrade dry-run for agentless policies only when the legacy API is disabled;
        // forced-upgrade entry points would otherwise 400 before rendering the edit page.
        const legacyAgentlessApiDisabled =
          ExperimentalFeaturesService.get().disableAgentlessLegacyAPI;
        let upgradePackagePolicyDryRunData: UpgradePackagePolicyDryRunResponse | undefined;
        if (legacyAgentlessApiDisabled && isAgentlessInstance) {
          // Clear any upgrade state left over from a previously loaded policy.
          setDryRunData(undefined);
        } else {
          const { data, error: upgradePackagePolicyDryRunError } =
            await sendUpgradePackagePolicyDryRun([packagePolicyId]);

          if (upgradePackagePolicyDryRunError) {
            throw upgradePackagePolicyDryRunError;
          }

          if (ignore) {
            return;
          }

          upgradePackagePolicyDryRunData = data ?? undefined;
        }

        const hasUpgrade = upgradePackagePolicyDryRunData
          ? hasUpgradeAvailable(upgradePackagePolicyDryRunData)
          : false;

        const isUpgradeScenario = options.forceUpgrade && hasUpgrade;
        // If the dry run data doesn't indicate a difference in version numbers, flip the form back
        // to its non-upgrade state, even if we were initially set to the upgrade view
        if (!hasUpgrade) {
          setIsUpgrade(false);
        }

        if (upgradePackagePolicyDryRunData && hasUpgrade) {
          setDryRunData(upgradePackagePolicyDryRunData);
        }

        const basePolicy: PackagePolicy | undefined = packagePolicyData?.item;
        let baseInputs: any = basePolicy?.inputs;
        let basePackage: any = basePolicy?.package;
        let baseVars = basePolicy?.vars;

        const proposedUpgradePackagePolicy = upgradePackagePolicyDryRunData?.[0]?.diff?.[1];

        if (isUpgradeScenario) {
          if (!proposedUpgradePackagePolicy) {
            throw new Error(
              'There was an error when trying to load upgrade diff for that package policy'
            );
          }
          // If we're upgrading the package, we need to "start from" the policy as it's returned from
          // the dry run so we can allow the user to edit any new variables before saving + upgrading
          baseInputs = proposedUpgradePackagePolicy.inputs;
          basePackage = proposedUpgradePackagePolicy.package;
          baseVars = proposedUpgradePackagePolicy.vars;
        }

        if (basePolicy) {
          setOriginalPackagePolicy(basePolicy);

          const {
            id,
            revision,
            inputs,
            vars,
            created_by,
            created_at,
            updated_by,
            updated_at,
            secret_references,
            ...restOfPackagePolicy
          } = basePolicy;

          // const newVars = baseVars;

          // Remove `compiled_stream` from all stream info, we assign this after saving
          const newPackagePolicy: UpdatePackagePolicy = {
            ...restOfPackagePolicy,
            // If we're upgrading, we need to make sure we catch an addition of package-level
            // vars when they were previously no package-level vars defined
            vars: mergeVars(baseVars, vars),
            inputs: baseInputs.map((input: any) => {
              // Remove `compiled_input` from all input info, we assign this after saving
              const {
                streams,
                compiled_input: compiledInput,
                vars: inputVars,
                ...restOfInput
              } = input;

              const basePolicyInputVars: any =
                isUpgradeScenario &&
                basePolicy.inputs.find(
                  (i) => i.type === input.type && i.policy_template === input.policy_template
                )?.vars;
              let newInputVars = inputVars;
              if (basePolicyInputVars && inputVars) {
                // Iterate over the dry run keys (authoritative schema — includes new vars added
                // by the upgrade). For each key, prefer the dry run value when non-null; fall back
                // to the old policy value only when the dry run produced no value. This ensures:
                //  - New vars introduced by the upgrade are not silently dropped (dry run is base)
                //  - migrate_from results are not overwritten by stale old-policy values
                newInputVars = Object.entries(
                  inputVars as PackagePolicyConfigRecord
                ).reduce<PackagePolicyConfigRecord>((acc, [key, dryRunEntry]) => {
                  acc[key] = {
                    ...dryRunEntry,
                    value: dryRunEntry.value ?? basePolicyInputVars[key]?.value,
                  };
                  return acc;
                }, {});
              }
              // Fix duration vars, if it's a migrated setting, and it's a plain old number with no suffix
              if (basePackage.name === 'apm') {
                newInputVars = fixApmDurationVars(newInputVars);
              }
              return {
                ...restOfInput,
                streams: streams.map((stream: any) => {
                  const { compiled_stream, ...restOfStream } = stream;
                  return restOfStream;
                }),
                vars: newInputVars,
              };
            }),
            package: basePackage,
          };

          setPackagePolicy(newPackagePolicy);

          if (basePolicy.package) {
            let _packageInfo = basePolicy.package;

            // When upgrading, we need to grab the `packageInfo` data from the new package version's
            // proposed policy (comes from the dry run diff) to ensure we have the valid package key/version
            // before saving
            if (isUpgradeScenario && !!upgradePackagePolicyDryRunData?.[0]?.diff?.[1]?.package) {
              _packageInfo = upgradePackagePolicyDryRunData[0].diff?.[1]?.package;
            }

            const { data: packageData } = await sendGetPackageInfoByKey(
              _packageInfo!.name,
              _packageInfo!.version,
              { prerelease, full: true }
            );

            if (ignore) {
              return;
            }

            if (packageData?.item && yaml) {
              setPackageInfo(packageData.item);

              const newValidationResults = validatePackagePolicy(
                newPackagePolicy,
                packageData.item,
                { safeLoadYaml: yaml.parse, conditionValidator: validateAgentConditionExpression }
              );
              setValidationResults(newValidationResults);

              if (validationHasErrors(newValidationResults)) {
                setFormState('INVALID');
              } else {
                setFormState('VALID');
              }
            }
          }
        }
      } catch (e) {
        if (!ignore) {
          setLoadingError(e);
        }
      }
      if (!ignore) {
        setIsLoadingData(false);
      }
    };
    getData();
    return () => {
      ignore = true;
    };
  }, [packagePolicyId, options.forceUpgrade, isAgentlessOption, yaml]);

  // Load the agentless policy through the agentless API. Deliberately skips the agent-policy bulk
  // read and the upgrade dry-run: agentless deployments have no user-facing agent policy, and the
  // edit page has no upgrade flow (agentless upgrades go through the dedicated bulk `_upgrade`
  // surface, not this form).
  useEffect(() => {
    // Wait for `yaml` before fetching: the whole load (hydration + validation) needs it, so firing
    // the GET before it's ready would just throw the result away and cause a second, redundant call
    // once `yaml` resolves.
    if (!isAgentlessOption || !yaml) {
      return;
    }
    // See the legacy loader above: this flag lets the cleanup discard a superseded/late response
    // so it can't clobber the state written by the newer run (or the other loader).
    let ignore = false;
    const getAgentlessData = async () => {
      setIsLoadingData(true);
      setLoadingError(undefined);
      setIsUpgrade(false);
      try {
        // The shared read helper throws on failure (no `{ data, error }` envelope), so
        // `loadingError` carries the real failure (status code, message) rather than the page's
        // generic loading-error copy.
        const {
          agentlessPolicy,
          packageInfo: agentlessPackageInfo,
          packagePolicy: hydratedPackagePolicy,
        } = await fetchAgentlessPolicyAsPackagePolicy(packagePolicyId);

        if (ignore) {
          return;
        }

        setPackageInfo(agentlessPackageInfo);
        setPackagePolicy(hydratedPackagePolicy as UpdatePackagePolicy);
        // Edit extensions receive the loaded policy as their baseline. Agentless policies carry
        // no server-only compiled fields at edit time, so the hydrated form policy is the
        // "original" — enriched with the identifiers/timestamps from the API response.
        setOriginalPackagePolicy({
          ...hydratedPackagePolicy,
          id: agentlessPolicy.id,
          revision: 1,
          created_at: agentlessPolicy.created_at,
          created_by: agentlessPolicy.created_by,
          updated_at: agentlessPolicy.updated_at,
          updated_by: agentlessPolicy.updated_by,
        } as PackagePolicy);

        const newValidationResults = validatePackagePolicy(
          hydratedPackagePolicy,
          agentlessPackageInfo,
          { safeLoadYaml: yaml.parse, conditionValidator: validateAgentConditionExpression }
        );
        setValidationResults(newValidationResults);
        setFormState(validationHasErrors(newValidationResults) ? 'INVALID' : 'VALID');
      } catch (e) {
        if (!ignore) {
          setLoadingError(e);
        }
      }
      if (!ignore) {
        setIsLoadingData(false);
      }
    };
    getAgentlessData();
    return () => {
      ignore = true;
    };
  }, [packagePolicyId, isAgentlessOption, yaml]);

  // Re-run validation when yaml loads (getData may have run before yaml was available)
  useEffect(() => {
    if (yaml && packageInfo && packagePolicy) {
      updatePackagePolicyValidation();
    }
  }, [yaml, packageInfo, packagePolicy, updatePackagePolicyValidation]);

  return {
    // form
    formState,
    validationResults,
    hasErrors,
    upgradeDryRunData: dryRunData,
    setFormState,
    updatePackagePolicy,
    isEdited,
    setIsEdited,
    // data
    packageInfo,
    isUpgrade,
    savePackagePolicy,
    isLoadingData,
    agentPolicies,
    loadingError,
    packagePolicy,
    originalPackagePolicy,
  };
}
