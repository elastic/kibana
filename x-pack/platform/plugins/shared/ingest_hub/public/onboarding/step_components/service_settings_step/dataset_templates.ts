/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { getDefaultEnabledDataStreams, makeDsView } from '../../aws_service_matrix';
import { DATASET_VAR_NAME, isCustomDataset, resolveFieldMeta } from './field_config';
import type { ServiceInstance, ServiceVars } from './use_service_settings';

interface PolicyMember {
  instance: ServiceInstance;
  service: AwsServiceMatrixEntry;
}

/** One stream that takes a dataset: a customised one can opt out, one at its default cannot. */
interface DatasetStream {
  custom: boolean;
  optedOut: boolean;
}

/**
 * The enabled streams of a service that carry a `data_stream.dataset` var. For an input package
 * Fleet creates a dedicated index template for each of them, the default dataset included. A
 * service never configured counts with its defaults, since it deploys with them.
 */
function getDatasetStreams(
  service: AwsServiceMatrixEntry,
  vars: ServiceVars | undefined
): DatasetStream[] {
  const streams: DatasetStream[] = [];
  const enabledDataStreams = vars?.enabledDataStreams ?? getDefaultEnabledDataStreams(service);
  for (const dsId of enabledDataStreams) {
    if (!service.dataStreams.includes(dsId)) continue;
    const dsView = makeDsView(service, dsId);
    const dsVars = vars?.varsByDataStream[dsId];
    const inputs =
      dsVars?.enabledInputs ??
      (dsView.defaultEnabledInputs?.length ? dsView.defaultEnabledInputs : dsView.inputs ?? []);
    for (const input of inputs) {
      if (!resolveFieldMeta(dsView, input, DATASET_VAR_NAME)) continue;
      const custom = isCustomDataset(dsView, input, dsVars?.varsByInput[input]);
      streams.push({ custom, optedOut: custom && dsVars?.createDatasetTemplates === false });
    }
  }
  return streams;
}

const getMemberVars = (
  { instance }: PolicyMember,
  storedServiceVars: Record<string, ServiceVars>
): ServiceVars | undefined =>
  storedServiceVars[instance.instanceId] ?? storedServiceVars[instance.serviceId];

/**
 * The `create_dataset_templates` flag for one policy: `false` only when every stream it deploys
 * opted out. One policy takes one flag, so a stream that still needs its template (one that
 * cannot opt out, or one left on) keeps it for the whole policy and Fleet's default applies.
 */
export function getCreateDatasetTemplates(
  members: PolicyMember[],
  storedServiceVars: Record<string, ServiceVars>
): false | undefined {
  const streams = members.flatMap((member) =>
    getDatasetStreams(member.service, getMemberVars(member, storedServiceVars))
  );
  return streams.length > 0 && streams.every(({ optedOut }) => optedOut) ? false : undefined;
}

export interface DatasetTemplatesBundle {
  /** Names of the other services of the policy whose template cannot be skipped. */
  requiredBy: string[];
  /** Names of the other services of the policy that take a dataset. */
  sharedWith: string[];
}

/** What the other services of the same policy mean for one service's switch. */
export function getDatasetTemplatesBundle(
  instanceId: string,
  members: PolicyMember[],
  storedServiceVars: Record<string, ServiceVars>
): DatasetTemplatesBundle {
  const bundle: DatasetTemplatesBundle = { requiredBy: [], sharedWith: [] };
  for (const member of members) {
    if (member.instance.instanceId === instanceId) continue;
    const streams = getDatasetStreams(member.service, getMemberVars(member, storedServiceVars));
    if (streams.length === 0) continue;
    bundle.sharedWith.push(member.instance.name);
    if (streams.some(({ custom }) => !custom)) bundle.requiredBy.push(member.instance.name);
  }
  return bundle;
}
