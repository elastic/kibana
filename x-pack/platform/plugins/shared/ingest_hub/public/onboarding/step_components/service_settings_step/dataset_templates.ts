/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { getDefaultEnabledDataStreams, makeDsView } from '../../aws_service_matrix';
import { offersDatasetTemplates } from './field_config';
import type { ServiceInstance, ServiceVars } from './use_service_settings';

interface PolicyMember {
  instance: ServiceInstance;
  service: AwsServiceMatrixEntry;
}

/**
 * Whether a service has a stream the dedicated index template switch applies to. A service never
 * configured counts with its defaults, since it deploys with them.
 */
function offersTemplatesSwitch(service: AwsServiceMatrixEntry, vars: ServiceVars | undefined) {
  const enabledDataStreams = vars?.enabledDataStreams ?? getDefaultEnabledDataStreams(service);
  return enabledDataStreams.some((dsId) => {
    if (!service.dataStreams.includes(dsId)) return false;
    const dsView = makeDsView(service, dsId);
    const dsVars = vars?.varsByDataStream[dsId];
    const inputs =
      dsVars?.enabledInputs ??
      (dsView.defaultEnabledInputs?.length ? dsView.defaultEnabledInputs : dsView.inputs ?? []);
    return inputs.some((input) =>
      offersDatasetTemplates(dsView, input, dsVars?.varsByInput[input])
    );
  });
}

const getMemberVars = (
  { instance }: PolicyMember,
  storedServiceVars: Record<string, ServiceVars>
): ServiceVars | undefined =>
  storedServiceVars[instance.instanceId] ?? storedServiceVars[instance.serviceId];

/** The services of a policy the switch applies to. */
const getSwitchMembers = (
  members: PolicyMember[],
  storedServiceVars: Record<string, ServiceVars>
): PolicyMember[] =>
  members.filter((member) =>
    offersTemplatesSwitch(member.service, getMemberVars(member, storedServiceVars))
  );

/**
 * The one value a policy takes, as in Fleet's form: off only when every service it applies to
 * turned it off. Shown in each switch and sent on deploy, so the two cannot disagree.
 */
const isEnabledFor = (
  members: PolicyMember[],
  storedServiceVars: Record<string, ServiceVars>
): boolean =>
  members.some(
    (member) => getMemberVars(member, storedServiceVars)?.createDatasetTemplates !== false
  );

/**
 * The `create_dataset_templates` value for one policy, sent explicitly like Fleet's form does:
 * the server default for a package that is not an input package is off, so a switch shown on has
 * to say so. Undefined when the switch applies to none of the policy's services.
 */
export function getCreateDatasetTemplates(
  members: PolicyMember[],
  storedServiceVars: Record<string, ServiceVars>
): boolean | undefined {
  const switchMembers = getSwitchMembers(members, storedServiceVars);
  return switchMembers.length > 0 ? isEnabledFor(switchMembers, storedServiceVars) : undefined;
}

export interface DatasetTemplatesPolicy {
  /** The value of the policy, which every switch of its services shows. */
  enabled: boolean;
  /** The services of the policy the switch applies to; a change is written to each of them. */
  instanceIds: string[];
  /** Names of the others among them. */
  sharedWith: string[];
}

/** The template choice of the policy `instanceId` deploys in, from its members. */
export function getDatasetTemplatesPolicy(
  instanceId: string,
  members: PolicyMember[],
  storedServiceVars: Record<string, ServiceVars>
): DatasetTemplatesPolicy | undefined {
  const switchMembers = getSwitchMembers(members, storedServiceVars);
  if (!switchMembers.some((member) => member.instance.instanceId === instanceId)) return undefined;
  return {
    enabled: isEnabledFor(switchMembers, storedServiceVars),
    instanceIds: switchMembers.map(({ instance }) => instance.instanceId),
    sharedWith: switchMembers
      .filter(({ instance }) => instance.instanceId !== instanceId)
      .map(({ instance }) => instance.name),
  };
}
