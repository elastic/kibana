/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObject,
  ElasticsearchClient,
  KibanaRequest,
} from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { omit } from 'lodash';
import pMap from 'p-map';

import {
  FLEET_PROXY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
  MAX_CONCURRENT_FLEET_PROXIES_OPERATIONS,
} from '../constants';
import { FleetProxyUnauthorizedError } from '../errors';
import { validateFleetSavedObjectId } from '../../common/services';
import type {
  DownloadSource,
  FleetProxy,
  FleetProxySOAttributes,
  FleetServerHost,
  NewFleetProxy,
  Output,
} from '../types';

import { appContextService } from './app_context';

import { fleetServerHostService } from './fleet_server_host';
import { outputService } from './output';
import { downloadSourceService } from './download_source';
import { agentPolicyService } from './agent_policy';
import { packagePolicyService } from './package_policy';
import { assertPrivilegesInSpaces } from './security/assert_privileges_in_spaces';
import { getAllSpaceIds } from './spaces/helpers';

/**
 * Proxies are space-agnostic and are referenced by outputs, Fleet Server hosts and download
 * sources (themselves space-agnostic). Mutating or deleting a proxy redirects traffic for every
 * agent policy that uses one of those objects, across every space. Fail closed unless the caller
 * holds Fleet privileges in all of those spaces.
 *
 * Takes the already-fetched related objects so the caller authorizes against the exact same set it
 * then mutates (no second lookup that could race), and fails closed when that set is incomplete.
 */
async function assertProxyCrossSpacePrivileges(
  request: KibanaRequest,
  proxyId: string,
  related: Awaited<ReturnType<typeof getFleetProxyRelatedSavedObjects>>
) {
  const security = appContextService.getSecurity();
  if (!security || !security.authz.mode.useRbacForRequest(request)) {
    return;
  }
  const { outputs, fleetServerHosts, downloadSources, truncated } = related;
  if (truncated) {
    throw new FleetProxyUnauthorizedError(
      `Unable to verify authorization for proxy ${proxyId}: too many related settings objects to enumerate`
    );
  }
  // If any related object is itself a global default, policies that inherit the default (and
  // never reference the object by id) are affected too, in every space. Pull in all spaces for
  // that case rather than only the explicitly-referencing policies.
  const relatedDefault =
    outputs.some((o) => o.is_default || o.is_default_monitoring) ||
    fleetServerHosts.some((h) => h.is_default) ||
    downloadSources.some((d) => d.is_default);
  const lookups: Array<() => Promise<{ spaceIds: Set<string>; truncated: boolean }>> = [
    ...outputs.flatMap((o) => [
      () => agentPolicyService.getSpacesForPoliciesUsingOutput(o.id),
      () => packagePolicyService.getSpacesForPoliciesUsingOutput(o.id),
    ]),
    ...fleetServerHosts.map(
      (h) => () => agentPolicyService.getSpacesForPoliciesUsingFleetServerHost(h.id)
    ),
    ...downloadSources.map(
      (d) => () => agentPolicyService.getSpacesForPoliciesUsingDownloadSource(d.id)
    ),
    ...(relatedDefault ? [() => getAllSpaceIds()] : []),
  ];
  // Bound concurrency: a proxy shared by many settings objects would otherwise start every
  // cross-space policy search at once. Matches the limit used by the policy-bump path.
  const results = await pMap(lookups, (lookup) => lookup(), {
    concurrency: MAX_CONCURRENT_FLEET_PROXIES_OPERATIONS,
  });
  if (results.some((r) => r.truncated)) {
    throw new FleetProxyUnauthorizedError(
      `Unable to verify authorization for proxy ${proxyId}: too many agent policies to enumerate`
    );
  }
  const spaceIds = new Set<string>();
  for (const result of results) {
    for (const spaceId of result.spaceIds) {
      spaceIds.add(spaceId);
    }
  }
  await assertPrivilegesInSpaces({
    request,
    spaceIds,
    apiPrivileges: ['fleet-agent-policies-all'],
    errorMessage: `Insufficient privileges to modify proxy ${proxyId}: it is used by agent policies in spaces you are not authorized to access`,
  });
}

function savedObjectToFleetProxy(so: SavedObject<FleetProxySOAttributes>): FleetProxy {
  const { proxy_headers: proxyHeaders, ...rest } = so.attributes;

  return {
    id: so.id,
    proxy_headers: proxyHeaders && proxyHeaders !== '' ? JSON.parse(proxyHeaders) : undefined,
    ...rest,
  };
}

function fleetProxyDataToSOAttribute(data: NewFleetProxy): FleetProxySOAttributes;
function fleetProxyDataToSOAttribute(data: Partial<NewFleetProxy>): Partial<FleetProxySOAttributes>;
function fleetProxyDataToSOAttribute(
  data: Partial<NewFleetProxy> | NewFleetProxy
): Partial<FleetProxySOAttributes> | Partial<FleetProxySOAttributes> {
  const { proxy_headers: proxyHeaders, ...rest } = data;

  return {
    proxy_headers: proxyHeaders ? JSON.stringify(proxyHeaders) : null,
    ...rest,
  };
}

export async function listFleetProxies(soClient: SavedObjectsClientContract) {
  const res = await soClient.find<FleetProxySOAttributes>({
    type: FLEET_PROXY_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
  });

  return {
    items: res.saved_objects.map<FleetProxy>(savedObjectToFleetProxy),
    total: res.total,
    page: res.page,
    perPage: res.per_page,
  };
}

export async function createFleetProxy(
  soClient: SavedObjectsClientContract,
  data: NewFleetProxy,
  options?: { id?: string; overwrite?: boolean; fromPreconfiguration?: boolean }
): Promise<FleetProxy> {
  const logger = appContextService.getLogger();
  logger.debug(`Creating fleet proxy ${data}`);

  validateFleetSavedObjectId(options?.id);

  const res = await soClient.create<FleetProxySOAttributes>(
    FLEET_PROXY_SAVED_OBJECT_TYPE,
    fleetProxyDataToSOAttribute(data),
    {
      id: options?.id,
      overwrite: options?.overwrite,
    }
  );
  logger.debug(`Created fleet proxy ${options?.id}`);
  return savedObjectToFleetProxy(res);
}

export async function bulkCreateFleetProxies(
  soClient: SavedObjectsClientContract,
  proxies: Array<NewFleetProxy & { id?: string }>,
  options?: { overwrite?: boolean }
): Promise<FleetProxy[]> {
  if (proxies.length === 0) {
    return [];
  }
  const logger = appContextService.getLogger();
  logger.debug(`Bulk creating ${proxies.length} fleet proxies`);

  const res = await soClient.bulkCreate<FleetProxySOAttributes>(
    proxies.map(({ id, ...data }) => ({
      type: FLEET_PROXY_SAVED_OBJECT_TYPE,
      id,
      attributes: fleetProxyDataToSOAttribute(data),
    })),
    { overwrite: options?.overwrite }
  );

  const itemErrors = res.saved_objects.filter(isSavedObjectErrorResult);
  if (itemErrors.length > 0) {
    throw itemErrors[0].error;
  }

  logger.debug(`Bulk created ${proxies.length} fleet proxies`);
  return res.saved_objects
    .filter((so): so is SavedObject<FleetProxySOAttributes> => !isSavedObjectErrorResult(so))
    .map(savedObjectToFleetProxy);
}

export async function getFleetProxy(
  soClient: SavedObjectsClientContract,
  id: string
): Promise<FleetProxy> {
  const res = await soClient.get<FleetProxySOAttributes>(FLEET_PROXY_SAVED_OBJECT_TYPE, id);

  return savedObjectToFleetProxy(res);
}

export async function deleteFleetProxy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  id: string,
  options?: { fromPreconfiguration?: boolean; request?: KibanaRequest }
) {
  const logger = appContextService.getLogger();
  logger.debug(`Deleting fleet proxy ${id}`);

  const fleetProxy = await getFleetProxy(soClient, id);

  if (fleetProxy.is_preconfigured && !options?.fromPreconfiguration) {
    throw new FleetProxyUnauthorizedError(`Cannot delete ${id} preconfigured proxy`);
  }

  // Read the related objects once and authorize against that exact set, then detach the same set,
  // so a reference added between an authorization read and the detach cannot slip through.
  const related = await getFleetProxyRelatedSavedObjects(id);
  const { outputs, fleetServerHosts, downloadSources } = related;

  if (options?.request && !options.fromPreconfiguration) {
    await assertProxyCrossSpacePrivileges(options.request, id, related);
  }

  if (
    // download sources cannot be preconfigured
    [...fleetServerHosts, ...outputs].some(
      (fleetServerHostOrOutput) => fleetServerHostOrOutput.is_preconfigured
    ) &&
    !options?.fromPreconfiguration
  ) {
    throw new FleetProxyUnauthorizedError(
      'Cannot delete a proxy used in a preconfigured fleet server hosts or output.'
    );
  }

  await updateRelatedSavedObject(soClient, esClient, fleetServerHosts, outputs, downloadSources);
  logger.debug(`Deleted fleet proxy ${id}`);

  return await soClient.delete(FLEET_PROXY_SAVED_OBJECT_TYPE, id);
}

export async function updateFleetProxy(
  soClient: SavedObjectsClientContract,
  id: string,
  data: Partial<FleetProxy>,
  options?: { fromPreconfiguration?: boolean; request?: KibanaRequest }
) {
  const logger = appContextService.getLogger();
  logger.debug(`Updating fleet proxy ${id}`);
  const originalItem = await getFleetProxy(soClient, id);

  if (data.is_preconfigured && !options?.fromPreconfiguration) {
    throw new FleetProxyUnauthorizedError(`Cannot update ${id} preconfigured proxy`);
  }

  if (options?.request && !options.fromPreconfiguration) {
    const related = await getFleetProxyRelatedSavedObjects(id);
    await assertProxyCrossSpacePrivileges(options.request, id, related);
  }

  await soClient.update<FleetProxySOAttributes>(
    FLEET_PROXY_SAVED_OBJECT_TYPE,
    id,
    fleetProxyDataToSOAttribute(data)
  );
  logger.debug(`Updated fleet proxy ${id}`);
  return {
    ...originalItem,
    ...data,
  };
}

export async function bulkGetFleetProxies(
  soClient: SavedObjectsClientContract,
  ids: string[],
  { ignoreNotFound = false } = { ignoreNotFound: true }
) {
  if (ids.length === 0) {
    return [];
  }

  const res = await soClient.bulkGet<FleetProxySOAttributes>(
    ids.map((id) => ({
      id,
      type: FLEET_PROXY_SAVED_OBJECT_TYPE,
    }))
  );

  return res.saved_objects
    .map((so) => {
      if (isSavedObjectErrorResult(so)) {
        if (!ignoreNotFound || so.error.statusCode !== 404) {
          throw so.error;
        }
        return undefined;
      }

      return savedObjectToFleetProxy(so);
    })
    .filter(
      (fleetProxyOrUndefined): fleetProxyOrUndefined is FleetProxy =>
        typeof fleetProxyOrUndefined !== 'undefined'
    );
}

async function updateRelatedSavedObject(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  fleetServerHosts: FleetServerHost[],
  outputs: Output[],
  downloadSources: DownloadSource[]
) {
  await pMap(
    fleetServerHosts,
    (fleetServerHost) =>
      fleetServerHostService.update(soClient, esClient, fleetServerHost.id, {
        ...omit(fleetServerHost, 'id'),
        proxy_id: null,
      }),
    { concurrency: MAX_CONCURRENT_FLEET_PROXIES_OPERATIONS }
  );

  await pMap(
    outputs,
    (output) =>
      outputService.update(soClient, esClient, output.id, {
        ...omit(output, 'id'),
        proxy_id: null,
      } as Partial<Output>),
    { concurrency: MAX_CONCURRENT_FLEET_PROXIES_OPERATIONS }
  );

  await pMap(downloadSources, (downloadSource) =>
    downloadSourceService.update(soClient, esClient, downloadSource.id, {
      ...omit(downloadSource, 'id'),
      proxy_id: null,
    })
  );
}

export async function getFleetProxyRelatedSavedObjects(proxyId: string) {
  const [
    { items: fleetServerHosts, total: fleetServerHostsTotal },
    { items: outputs, total: outputsTotal },
    { items: downloadSources, total: downloadSourcesTotal },
  ] = await Promise.all([
    fleetServerHostService.listAllForProxyId(proxyId),
    outputService.listAllForProxyId(proxyId),
    downloadSourceService.listAllForProxyId(proxyId),
  ]);

  // True when any related-object listing was capped: the set of settings objects using the proxy
  // is then incomplete, so callers that authorize against it must fail closed.
  const truncated =
    fleetServerHosts.length < fleetServerHostsTotal ||
    outputs.length < outputsTotal ||
    downloadSources.length < downloadSourcesTotal;

  return {
    fleetServerHosts,
    outputs,
    downloadSources,
    truncated,
  };
}
