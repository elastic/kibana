/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { makeDsView } from '../../aws_service_matrix';
import { getOnboardingSessionKey } from '../../onboarding_session_storage';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { getRequiredTextFields, resolveFieldMeta, toTyped } from './field_config';
import type { SignalFilter } from '../services_step/use_services_step';

export interface ServiceDataStreamVars {
  /** Input types enabled for this data stream. */
  enabledInputs: string[];
  /**
   * Var values keyed by input type, then var name.
   * e.g. { 'aws-s3': { bucket_arn: 'arn:...' } }
   */
  varsByInput: Record<string, Record<string, string>>;
}

export interface ServiceVars {
  /** Data stream ids enabled for this service instance. */
  enabledDataStreams: string[];
  /**
   * Per-data-stream var values. Keys are data stream ids (e.g. 'vpcflow', 'ec2_logs').
   */
  varsByDataStream: Record<string, ServiceDataStreamVars>;
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

interface PersistedState {
  globalRegion: string;
  /** Keyed by instanceId. */
  serviceVars: Record<string, ServiceVars>;
  /** Absent in old sessions — reconciled on read from selectedServiceIds. */
  instances?: ServiceInstance[];
}

export const SERVICE_SETTINGS_SESSION_KEY = getOnboardingSessionKey('aws', 'serviceSettingsStep');

/** Derive the canonical base instances (one per serviceId) from the selected ids list. */
function baseInstances(
  selectedServiceIds: string[],
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined
): ServiceInstance[] {
  return selectedServiceIds
    .map((id) => {
      const service = awsServicesMap?.get(id);
      if (!service || !service.showInUI) return null;
      return { instanceId: id, serviceId: id, name: service.name, isDuplicate: false };
    })
    .filter((i): i is ServiceInstance => i !== null);
}

/**
 * Reconcile persisted instances against the current selectedServiceIds.
 * - Keep instances whose serviceId is still selected.
 * - Add a base instance for any newly-selected service with no existing instance.
 * - Drop instances for deselected services.
 */
function reconcileInstances(
  selectedServiceIds: string[],
  persisted: ServiceInstance[] | undefined,
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined
): ServiceInstance[] {
  const selectedSet = new Set(selectedServiceIds);

  if (!persisted || persisted.length === 0) {
    return baseInstances(selectedServiceIds, awsServicesMap);
  }

  const kept = persisted.filter((inst) => selectedSet.has(inst.serviceId));
  const coveredServiceIds = new Set(kept.map((i) => i.serviceId));

  const added: ServiceInstance[] = [];
  for (const id of selectedServiceIds) {
    if (!coveredServiceIds.has(id)) {
      const service = awsServicesMap?.get(id);
      if (service?.showInUI) {
        added.push({ instanceId: id, serviceId: id, name: service.name, isDuplicate: false });
      }
    }
  }

  return [...kept, ...added];
}

function mergeVarsByDataStream(
  base: Record<string, ServiceDataStreamVars>,
  incoming: Record<string, ServiceDataStreamVars>
): Record<string, ServiceDataStreamVars> {
  const result: Record<string, ServiceDataStreamVars> = { ...base };
  for (const [dsId, dsVars] of Object.entries(incoming)) {
    const existing = result[dsId] ?? { enabledInputs: [], varsByInput: {} };
    const mergedByInput: Record<string, Record<string, string>> = { ...existing.varsByInput };
    for (const [input, fields] of Object.entries(dsVars.varsByInput)) {
      mergedByInput[input] = { ...(mergedByInput[input] ?? {}), ...fields };
    }
    result[dsId] = { enabledInputs: dsVars.enabledInputs, varsByInput: mergedByInput };
  }
  return result;
}

export function useServiceSettings({ onContinue }: { onContinue: () => void }) {
  const { servicesStep, removeDeployInstance, awsServicesMap } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [persisted, setPersisted] = useSessionStorage<PersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    {
      globalRegion: '',
      serviceVars: {},
    }
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

  // Reconcile instances each render — cheap since selectedServiceIds rarely changes.
  const instances: ServiceInstance[] = useMemo(
    () => reconcileInstances(selectedServiceIds, persisted?.instances, awsServicesMap),
    [selectedServiceIds, persisted?.instances, awsServicesMap]
  );

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
      enabledDataStreams: string[]
    ) => {
      const current = getServiceVars(instanceId);
      const merged = mergeVarsByDataStream(current.varsByDataStream, newVarsByDataStream);
      setPersisted({
        ...(persisted ?? { globalRegion: '', serviceVars: {} }),
        instances,
        serviceVars: {
          ...(persisted?.serviceVars ?? {}),
          [instanceId]: { enabledDataStreams, varsByDataStream: merged },
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
      enabledDataStreams: string[]
    ) => {
      const source = instances.find((i) => i.instanceId === sourceInstanceId);
      if (!source) return;

      const existingIds = new Set(instances.map((i) => i.instanceId));
      let n = instances.filter((i) => i.serviceId === source.serviceId && i.isDuplicate).length + 1;
      let newInstanceId = `${source.serviceId}__dup-${n}`;
      while (existingIds.has(newInstanceId)) {
        newInstanceId = `${source.serviceId}__dup-${++n}`;
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
    () =>
      instances.filter((inst) => {
        const service = awsServicesMap?.get(inst.serviceId);
        if (!service) return false;
        const config = getServiceVars(inst.instanceId);
        // getServiceVars returns service.dataStreams when the key is absent (never configured).
        // An explicitly stored empty array means the user disabled all inputs — respect it.
        const activeDataStreams = config.enabledDataStreams;
        return activeDataStreams.some((dsId) => {
          const dsInfo = service.varDefsByDataStream?.[dsId];
          const dsVars = config.varsByDataStream[dsId] ?? { enabledInputs: [], varsByInput: {} };
          const isSingleDs = service.dataStreams.length === 1;
          const activeInputs = dsVars.enabledInputs.length
            ? dsVars.enabledInputs
            : isSingleDs
            ? dsInfo?.inputs ?? []
            : dsInfo?.defaultEnabledInputs?.length
            ? dsInfo.defaultEnabledInputs
            : dsInfo?.inputs?.slice(0, 1) ?? [];
          const dsView = makeDsView(service, dsId);
          return activeInputs.some((inp) =>
            getRequiredTextFields(dsView, inp).some((f) => {
              const meta = resolveFieldMeta(dsView, inp, f);
              const raw = dsVars.varsByInput?.[inp]?.[f];
              const effective = meta ? toTyped(raw, meta) : raw ?? '';
              if (Array.isArray(effective)) return effective.length === 0;
              return typeof effective === 'string' && effective.trim() === '';
            })
          );
        });
      }),
    [instances, getServiceVars, awsServicesMap]
  );

  const incompleteInstanceIds = useMemo(
    () => new Set(incompleteInstances.map((i) => i.instanceId)),
    [incompleteInstances]
  );

  const isReady = useMemo(
    () => !!globalRegion.trim() && incompleteInstances.length === 0,
    [globalRegion, incompleteInstances]
  );

  const [globalRegionTouched, setGlobalRegionTouched] = useState(false);

  const handleNext = useCallback(() => {
    // Flush instances to session storage so step 4 can read them without going through step 2 again.
    setPersisted({
      ...(persisted ?? { globalRegion: '', serviceVars: {} }),
      instances,
    });
    onContinue();
  }, [onContinue, persisted, setPersisted, instances]);

  // All instance display names — used by the duplicate modal for collision detection.
  const allInstanceNames = useMemo(() => instances.map((i) => i.name), [instances]);

  return {
    globalRegion,
    setGlobalRegion,
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
