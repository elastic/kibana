/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isEqual } from 'lodash';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import {
  getMaxPackageName,
  isValidNamespace,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '@kbn/fleet-plugin/common';
import { sendGetPackagePolicies } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { makeDsView } from '../../aws_service_matrix';
import { getOnboardingSessionKey } from '../../core/onboarding_session_storage';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { reconcileInstances } from './instances';
import { useOnboardingSO } from '../authenticate_and_deploy_step/use_onboarding_so';
import { toSOSettingsUpdate } from '../authenticate_and_deploy_step/so_settings';
import {
  getMissingSourceGroup,
  getRequiredTextFields,
  resolveFieldMeta,
  toTyped,
} from './field_config';
import type { SignalFilter } from '../services_step/use_services_step';
import {
  AWS_MAIN_PACKAGE_NAME,
  AWS_OTEL_PACKAGE_NAME,
  getBareNamePackage,
  isMainPackageName,
} from '../authenticate_and_deploy_step/deploy_group_helpers';
import {
  getDescriptionError,
  getIntegrationNameError,
  supportsIntegrationSettings,
} from './integration_settings';

export interface ServiceDataStreamVars {
  /** Input types enabled for this data stream. */
  enabledInputs: string[];
  /**
   * Var values keyed by input type, then var name.
   * e.g. { 'aws-s3': { bucket_arn: 'arn:...' } }
   */
  varsByInput: Record<string, Record<string, string | string[]>>;
}

export interface ServiceVars {
  /** Data stream ids enabled for this service instance. */
  enabledDataStreams: string[];
  /**
   * Per-data-stream var values. Keys are data stream ids (e.g. 'vpcflow', 'ec2_logs').
   */
  varsByDataStream: Record<string, ServiceDataStreamVars>;
  /** Data stream namespace for this instance's policy. Empty or absent inherits the agent policy's. */
  namespace?: string;
}

/**
 * A row in the step-2 table. `instanceId` is the stable row identity;
 * `serviceId` is the policy-template / Fleet join key and remains unchanged.
 * Original instances keep instanceId === serviceId for backward compat with
 * session storage written by earlier builds.
 */
export interface ServiceInstance {
  instanceId: string;
  serviceId: string;
  /** Display name — defaults to service.name, "[Duplicate]"-suffixed for copies. */
  name: string;
  isDuplicate: boolean;
}

export interface ServiceSettingsPersistedState {
  globalRegion: string;
  /**
   * Integration name as entered. Policy names are derived from it at deploy time. Absent until
   * the default is prefilled or the user types one.
   */
  integrationName?: string;
  /** The Fleet-style default (`aws-<n>`) the name was prefilled from. Absent once the name came from a saved onboarding. */
  defaultNameBase?: string;
  /** The last name the prefill generated. While the name still equals it, it follows the selection. */
  autoName?: string;
  description?: string;
  /** Keyed by instanceId. */
  serviceVars: Record<string, ServiceVars>;
  /** Absent in old sessions — reconciled on read from selectedServiceIds. */
  instances?: ServiceInstance[];
}

export const SERVICE_SETTINGS_SESSION_KEY = getOnboardingSessionKey('aws', 'serviceSettingsStep');

/** Duplicate instance ids are `<serviceId>__dup-<n>`. */
export const getDuplicateInstanceIdPrefix = (serviceId: string): string => `${serviceId}__dup-`;

export const DEFAULT_SERVICE_SETTINGS: ServiceSettingsPersistedState = {
  globalRegion: '',
  serviceVars: {},
};

function mergeVarsByDataStream(
  base: Record<string, ServiceDataStreamVars>,
  incoming: Record<string, ServiceDataStreamVars>
): Record<string, ServiceDataStreamVars> {
  const result: Record<string, ServiceDataStreamVars> = { ...base };
  for (const [dsId, dsVars] of Object.entries(incoming)) {
    const existing = result[dsId] ?? { enabledInputs: [], varsByInput: {} };
    const mergedByInput: Record<string, Record<string, string | string[]>> = {
      ...existing.varsByInput,
    };
    for (const [input, fields] of Object.entries(dsVars.varsByInput)) {
      mergedByInput[input] = { ...(mergedByInput[input] ?? {}), ...fields };
    }
    result[dsId] = { enabledInputs: dsVars.enabledInputs, varsByInput: mergedByInput };
  }
  return result;
}

/**
 * Instances missing a required text field for any active input. `awsServicesMap` should already
 * reflect the selected deployment method (see the flow context), so the required set is
 * ARN-only under ECF and the full manifest set under agent-based.
 */
export function isServiceConfigIncomplete(
  service: AwsServiceMatrixEntry,
  config: ServiceVars
): boolean {
  if (!isValidNamespace(config.namespace ?? '', true).valid) return true;
  return config.enabledDataStreams.some((dsId) => {
    const dsInfo = service.varDefsByDataStream?.[dsId];
    const dsVars = config.varsByDataStream[dsId] ?? { enabledInputs: [], varsByInput: {} };
    const isSingleDs = service.dataStreams.length === 1;
    let activeInputs = dsVars.enabledInputs.length
      ? dsVars.enabledInputs
      : isSingleDs
      ? service.inputs ?? dsInfo?.inputs ?? []
      : dsInfo?.defaultEnabledInputs?.length
      ? dsInfo.defaultEnabledInputs
      : dsInfo?.inputs?.slice(0, 1) ?? [];
    const dsView = makeDsView(service, dsId);
    // Stored input selections outlive a method switch. Under ECF only the inputs ECF can route
    // count (WAF: S3 only); a selection left over from agent-based (e.g. CloudWatch only) would
    // otherwise pass with no supported source, and the ECF launch would carry none for the service.
    if (service.settingsScope === 'ecf' && dsVars.enabledInputs.length > 0) {
      const supportedInputs = dsView.inputs ?? [];
      activeInputs = activeInputs.filter((input) => supportedInputs.includes(input));
      if (activeInputs.length === 0) return true;
    }
    return activeInputs.some(
      (inp) =>
        getMissingSourceGroup(dsView, inp, dsVars.varsByInput?.[inp]) !== undefined ||
        getRequiredTextFields(dsView, inp).some((f) => {
          const meta = resolveFieldMeta(dsView, inp, f);
          const raw = dsVars.varsByInput?.[inp]?.[f];
          const effective = meta ? toTyped(raw, meta) : raw ?? '';
          if (Array.isArray(effective)) return effective.length === 0;
          return typeof effective === 'string' && effective.trim() === '';
        })
    );
  });
}

export function getIncompleteInstances(
  instances: ServiceInstance[],
  serviceVars: Record<string, ServiceVars>,
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined
): ServiceInstance[] {
  return instances.filter((inst) => {
    const service = awsServicesMap?.get(inst.serviceId);
    if (!service) return false;
    // An absent key means never configured: default to every data stream. An explicitly stored
    // empty array means the user disabled all inputs — respect it.
    const config: ServiceVars = serviceVars[inst.instanceId] ?? {
      enabledDataStreams: service.dataStreams,
      varsByDataStream: {},
    };
    return isServiceConfigIncomplete(service, config);
  });
}

export function useServiceSettings({ onContinue }: { onContinue: () => void }) {
  const {
    servicesStep,
    removeDeployInstance,
    awsServicesMap,
    deploymentMethod,
    setServiceSettingsMethod,
    detectAndReviewStep,
  } = useOnboardingFlow();
  const { updateDeployment } = useOnboardingSO();
  const { selectedServiceIds } = servicesStep;

  const [persisted, setPersisted] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );

  const globalRegion = persisted?.globalRegion ?? '';

  const setGlobalRegion = useCallback(
    (region: string) => {
      setPersisted({
        ...(persisted ?? { globalRegion: '', serviceVars: {} }),
        globalRegion: region,
      });
    },
    [persisted, setPersisted]
  );

  const integrationName = persisted?.integrationName ?? '';
  const description = persisted?.description ?? '';

  const setIntegrationName = useCallback(
    (name: string) => {
      setPersisted({
        ...(persisted ?? { globalRegion: '', serviceVars: {} }),
        integrationName: name,
      });
    },
    [persisted, setPersisted]
  );

  const setDescription = useCallback(
    (value: string) => {
      setPersisted({
        ...(persisted ?? { globalRegion: '', serviceVars: {} }),
        description: value,
      });
    },
    [persisted, setPersisted]
  );

  // Reconcile instances each render — cheap since selectedServiceIds rarely changes.
  const instances: ServiceInstance[] = useMemo(
    () =>
      reconcileInstances(
        persisted?.instances ?? [],
        selectedServiceIds,
        awsServicesMap ?? new Map()
      ),
    [selectedServiceIds, persisted?.instances, awsServicesMap]
  );

  // Packages of the services that deploy as a package policy. ECF-only services create none under
  // managed integration; the name and description still apply to them (they describe the
  // onboarding instance) but they do not take part in naming policies.
  const policyPackages = useMemo(
    () =>
      instances.flatMap((inst) => {
        const service = awsServicesMap?.get(inst.serviceId);
        return service && supportsIntegrationSettings(service, deploymentMethod)
          ? [service.packageName]
          : [];
      }),
    [instances, awsServicesMap, deploymentMethod]
  );

  // The package whose policy keeps the integration name as entered (the only package selected, or
  // the main one), so the default name already carries the package when that is not `aws`.
  const bareNamePackage = useMemo(() => getBareNamePackage(policyPackages), [policyPackages]);
  // Policies of the selected packages count too: a Bedrock-only deploy creates `aws-1-aws_bedrock`
  // under `aws_bedrock`, which an `aws`-only query never sees. Both main packages always count,
  // because ECS and OTel onboardings share the plain `aws-<n>` names.
  const defaultNamePackages = useMemo(
    () => [...new Set([AWS_MAIN_PACKAGE_NAME, AWS_OTEL_PACKAGE_NAME, ...policyPackages])].sort(),
    [policyPackages]
  );
  const defaultNamePackagesRef = useRef(defaultNamePackages);
  defaultNamePackagesRef.current = defaultNamePackages;
  const toAutoName = useCallback(
    (base: string) => (isMainPackageName(bareNamePackage) ? base : `${base}-${bareNamePackage}`),
    [bareNamePackage]
  );

  // Prefill the Fleet-style default (`aws-<n>`) once, when no name exists yet. The fetch can
  // outlive other edits, so the write is based on the latest persisted state.
  const persistedRef = useRef(persisted);
  persistedRef.current = persisted;
  const toAutoNameRef = useRef(toAutoName);
  toAutoNameRef.current = toAutoName;
  const isPrefilling = useRef(false);
  useEffect(() => {
    if (persisted?.integrationName !== undefined || isPrefilling.current) {
      return;
    }
    isPrefilling.current = true;
    let cancelled = false;
    (async () => {
      let base = `${AWS_MAIN_PACKAGE_NAME}-1`;
      try {
        const { data } = await sendGetPackagePolicies({
          perPage: SO_SEARCH_LIMIT,
          page: 1,
          kuery: defaultNamePackagesRef.current
            .map((pkg) => `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkg}`)
            .join(' or '),
        });
        base = getMaxPackageName(AWS_MAIN_PACKAGE_NAME, data?.items);
      } catch {
        // Best-effort: fall back to the first number, the user can still edit the name.
      }
      const latest = persistedRef.current;
      if (cancelled || latest?.integrationName !== undefined) {
        isPrefilling.current = false;
        return;
      }
      const name = toAutoNameRef.current(base);
      setPersisted({
        ...(latest ?? { globalRegion: '', serviceVars: {} }),
        integrationName: name,
        defaultNameBase: base,
        autoName: name,
      });
      isPrefilling.current = false;
    })();
    return () => {
      cancelled = true;
      isPrefilling.current = false;
    };
  }, [persisted?.integrationName, setPersisted]);

  // A name nobody edited follows the selection: Bedrock alone gives `aws-1-aws_bedrock`, adding an
  // `aws` service back gives `aws-1`.
  useEffect(() => {
    const { defaultNameBase, autoName } = persisted ?? {};
    if (!defaultNameBase || !autoName || persisted?.integrationName !== autoName) return;
    const next = toAutoName(defaultNameBase);
    if (next === autoName) return;
    setPersisted({
      ...(persisted ?? { globalRegion: '', serviceVars: {} }),
      integrationName: next,
      autoName: next,
    });
  }, [persisted, toAutoName, setPersisted]);

  // Keeps the stored copy in step with the reconciled one, so steps that read session storage
  // without going through this step (jumping ahead, a reload, a resume) see the same instances.
  // Also prunes serviceVars entries for instances no longer present (deselected in Step 1), in the
  // same write so the two never overwrite each other. Runs on mount and whenever the instance list
  // changes. Writing only when something differs breaks the update→re-run loop after one
  // iteration (the next run finds the stored instances equal and zero stale keys).
  // Guard: skip while awsServicesMap is still loading — instances would be empty, making every
  // stored key look stale and erasing valid configuration before the matrix can reconstruct them.
  useEffect(() => {
    if (!awsServicesMap) return;
    const validIds = new Set(instances.map((i) => i.instanceId));
    const storedVars = persisted?.serviceVars ?? {};
    const staleKeys = Object.keys(storedVars).filter((k) => !validIds.has(k));
    const instancesChanged = !isEqual(persisted?.instances ?? [], instances);
    if (staleKeys.length === 0 && !instancesChanged) return;
    const pruned: Record<string, ServiceVars> = {};
    for (const [k, v] of Object.entries(storedVars)) {
      if (validIds.has(k)) pruned[k] = v as ServiceVars;
    }
    setPersisted({
      ...(persisted ?? { globalRegion: '', serviceVars: {} }),
      instances,
      serviceVars: pruned,
    });
  }, [instances, persisted, setPersisted, awsServicesMap]);

  const getServiceVars = useCallback(
    (instanceId: string): ServiceVars => {
      const raw = persisted?.serviceVars?.[instanceId];
      if (raw) {
        return raw as ServiceVars;
      }
      const inst = instances.find((i) => i.instanceId === instanceId);
      const service = inst ? awsServicesMap?.get(inst.serviceId) : undefined;
      return {
        enabledDataStreams: service?.dataStreams ?? [],
        varsByDataStream: {},
      };
    },
    [persisted, instances, awsServicesMap]
  );

  // Applies multiple field changes (and optional enabled-data-streams update) in a single write to avoid
  // stale-closure overwrites when several vars are committed at once (flyout Save).
  const setServiceFieldsAndInputs = useCallback(
    (
      instanceId: string,
      newVarsByDataStream: Record<string, ServiceDataStreamVars>,
      enabledDataStreams: string[],
      namespace?: string
    ) => {
      const current = getServiceVars(instanceId);
      const merged = mergeVarsByDataStream(current.varsByDataStream, newVarsByDataStream);
      setPersisted({
        ...(persisted ?? { globalRegion: '', serviceVars: {} }),
        instances,
        serviceVars: {
          ...(persisted?.serviceVars ?? {}),
          [instanceId]: {
            enabledDataStreams,
            varsByDataStream: merged,
            namespace: namespace ?? current.namespace,
          },
        },
      });
    },
    [persisted, setPersisted, getServiceVars, instances]
  );

  const addDuplicate = useCallback(
    (
      sourceInstanceId: string,
      newName: string,
      newVarsByDataStream: Record<string, ServiceDataStreamVars>,
      enabledDataStreams: string[],
      namespace?: string
    ) => {
      const source = instances.find((i) => i.instanceId === sourceInstanceId);
      if (!source) return;

      const existingIds = new Set(instances.map((i) => i.instanceId));
      let n = instances.filter((i) => i.serviceId === source.serviceId && i.isDuplicate).length + 1;
      let newInstanceId = `${getDuplicateInstanceIdPrefix(source.serviceId)}${n}`;
      while (existingIds.has(newInstanceId)) {
        newInstanceId = `${getDuplicateInstanceIdPrefix(source.serviceId)}${++n}`;
      }

      const sourceVars = getServiceVars(sourceInstanceId);
      const mergedByDs = mergeVarsByDataStream(sourceVars.varsByDataStream, newVarsByDataStream);

      const newInstance: ServiceInstance = {
        instanceId: newInstanceId,
        serviceId: source.serviceId,
        name: newName,
        isDuplicate: true,
      };

      setPersisted({
        ...(persisted ?? { globalRegion: '', serviceVars: {} }),
        instances: [...instances, newInstance],
        serviceVars: {
          ...(persisted?.serviceVars ?? {}),
          [newInstanceId]: {
            enabledDataStreams: enabledDataStreams.length
              ? enabledDataStreams
              : sourceVars.enabledDataStreams,
            varsByDataStream: mergedByDs,
            namespace: namespace ?? sourceVars.namespace,
          },
        },
      });
    },
    [persisted, setPersisted, instances, getServiceVars]
  );

  const removeInstance = useCallback(
    (instanceId: string) => {
      const next = instances.filter((i) => i.instanceId !== instanceId);
      const nextVars = { ...(persisted?.serviceVars ?? {}) };
      delete nextVars[instanceId];
      setPersisted({
        ...(persisted ?? { globalRegion: '', serviceVars: {} }),
        instances: next,
        serviceVars: nextVars,
      });
      // Prune deploy state so removed instances don't leave orphaned chips,
      // stale failedInstances entries, or undismissable error callouts in step 4.
      removeDeployInstance(instanceId);
    },
    [persisted, setPersisted, instances, removeDeployInstance]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');

  const filteredInstances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return instances.filter((inst) => {
      const service = awsServicesMap?.get(inst.serviceId);
      if (!service) return false;
      if (signalFilter !== 'all' && !service.signalTypes.includes(signalFilter)) return false;
      if (q !== '' && !inst.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [instances, searchQuery, signalFilter, awsServicesMap]);

  const incompleteInstances = useMemo(
    () => getIncompleteInstances(instances, persisted?.serviceVars ?? {}, awsServicesMap),
    [instances, persisted?.serviceVars, awsServicesMap]
  );

  const incompleteInstanceIds = useMemo(
    () => new Set(incompleteInstances.map((i) => i.instanceId)),
    [incompleteInstances]
  );

  const integrationNameError = getIntegrationNameError(integrationName);
  const descriptionError = getDescriptionError(description);

  const isReady = useMemo(
    () =>
      !!globalRegion.trim() &&
      incompleteInstances.length === 0 &&
      !integrationNameError &&
      !descriptionError,
    [globalRegion, incompleteInstances, integrationNameError, descriptionError]
  );

  const [globalRegionTouched, setGlobalRegionTouched] = useState(false);

  const handleNext = useCallback(() => {
    setServiceSettingsMethod(deploymentMethod);
    // The name and description stay editable after a deploy, and a later deploy may find nothing
    // to do, so save them to the onboarding record here. Best-effort: the next deploy writes them
    // again.
    const deploymentId = detectAndReviewStep?.onboardingDeploymentId;
    if (deploymentId) {
      updateDeployment(deploymentId, toSOSettingsUpdate(persisted));
    }
    onContinue();
  }, [
    onContinue,
    persisted,
    deploymentMethod,
    setServiceSettingsMethod,
    detectAndReviewStep?.onboardingDeploymentId,
    updateDeployment,
  ]);

  // All instance display names — used by the duplicate modal for collision detection.
  const allInstanceNames = useMemo(() => instances.map((i) => i.name), [instances]);

  return {
    globalRegion,
    setGlobalRegion,
    integrationName,
    setIntegrationName,
    integrationNameError,
    description,
    setDescription,
    descriptionError,
    bareNamePackage,
    instances,
    filteredInstances,
    incompleteInstances,
    incompleteInstanceIds,
    searchQuery,
    setSearchQuery,
    signalFilter,
    setSignalFilter,
    getServiceVars,
    setServiceFieldsAndInputs,
    addDuplicate,
    removeInstance,
    allInstanceNames,
    globalRegionTouched,
    setGlobalRegionTouched,
    isReady,
    handleNext,
  };
}
