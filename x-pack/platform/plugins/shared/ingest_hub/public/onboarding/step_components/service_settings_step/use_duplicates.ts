/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import type { AwsServiceMatrixEntry, DeploymentMethod } from '../../aws_service_matrix';
import { buildDuplicateName, getDuplicateBaseName, getRenamedDuplicate } from './duplicate_name';
import type { ServiceDataStreamVars, ServiceInstance, ServiceVars } from './use_service_settings';

interface UseDuplicatesParams {
  instances: ServiceInstance[];
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined;
  allInstanceNames: string[];
  getServiceVars: (instanceId: string) => ServiceVars;
  addDuplicate: (
    sourceInstanceId: string,
    name: string,
    varsByDataStream: Record<string, ServiceDataStreamVars>,
    enabledDataStreams: string[],
    namespace?: string
  ) => void;
  integrationName: string;
  globalNamespace: string;
  bareNamePackage: string;
  deploymentMethod: DeploymentMethod | undefined;
  policyIdsByInstance: Record<string, string>;
}

/**
 * The duplicate modal's state and the naming of duplicates (see `getDuplicateBaseName`). A
 * generated name follows the duplicate's namespace until the user picks another name.
 */
export function useDuplicates({
  instances,
  awsServicesMap,
  allInstanceNames,
  getServiceVars,
  addDuplicate,
  integrationName,
  globalNamespace,
  bareNamePackage,
  deploymentMethod,
  policyIdsByInstance,
}: UseDuplicatesParams) {
  const [sourceInstanceId, setSourceInstanceId] = useState<string | null>(null);

  const sourceInstance = sourceInstanceId
    ? instances.find((i) => i.instanceId === sourceInstanceId) ?? null
    : null;
  const sourceService = sourceInstance
    ? awsServicesMap?.get(sourceInstance.serviceId) ?? null
    : null;

  const getBaseName = useCallback(
    (service: AwsServiceMatrixEntry, namespace: string): string =>
      getDuplicateBaseName(service, namespace, {
        integrationName,
        globalNamespace,
        bareNamePackage,
        deploymentMethod,
      }),
    [integrationName, globalNamespace, bareNamePackage, deploymentMethod]
  );

  /** The suggested name of a new duplicate of `service` in `namespace`. */
  const suggestName = useCallback(
    (service: AwsServiceMatrixEntry, namespace: string): string =>
      buildDuplicateName(getBaseName(service, namespace), allInstanceNames),
    [getBaseName, allInstanceNames]
  );

  /**
   * The new name of a duplicate moving to `nextNamespace`, when it still has the generated name.
   * Not once deployed: the policy keeps the name it was created with.
   */
  const getRenamedName = useCallback(
    (instanceId: string, nextNamespace: string | undefined): string | undefined => {
      const instance = instances.find((i) => i.instanceId === instanceId);
      const service = instance ? awsServicesMap?.get(instance.serviceId) : undefined;
      if (!instance?.isDuplicate || !service || nextNamespace === undefined) return undefined;
      if (policyIdsByInstance[instanceId]) return undefined;
      return getRenamedDuplicate(
        instance.name,
        getBaseName(service, getServiceVars(instanceId).namespace ?? ''),
        getBaseName(service, nextNamespace),
        allInstanceNames.filter((n) => n !== instance.name)
      );
    },
    [instances, awsServicesMap, policyIdsByInstance, getBaseName, getServiceVars, allInstanceNames]
  );

  const add = useCallback(
    (
      name: string,
      varsByDataStream: Record<string, ServiceDataStreamVars>,
      enabledDataStreams: string[],
      namespace: string
    ) => {
      if (!sourceInstanceId) return;
      addDuplicate(sourceInstanceId, name, varsByDataStream, enabledDataStreams, namespace);
      setSourceInstanceId(null);
    },
    [sourceInstanceId, addDuplicate]
  );

  return {
    /** The instance being duplicated and its service, while the modal is open. */
    source:
      sourceInstance && sourceService ? { instance: sourceInstance, service: sourceService } : null,
    open: setSourceInstanceId,
    close: () => setSourceInstanceId(null),
    add,
    suggestName,
    getRenamedName,
  };
}
