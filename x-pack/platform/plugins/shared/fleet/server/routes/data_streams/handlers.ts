/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Dictionary } from 'lodash';
import { keyBy, keys, merge } from 'lodash';
import type { RequestHandler } from '@kbn/core/server';
import pMap from 'p-map';
import type { IndicesDataStreamsStatsDataStreamsStatsItem } from '@elastic/elasticsearch/lib/api/types';
import { ByteSizeValue } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';

import type { DataStream } from '../../types';
import { KibanaSavedObjectType } from '../../../common/types';
import type { GetDataStreamsResponse } from '../../../common/types';
import { getPackageSavedObjects } from '../../services/epm/packages/get';
import type { MeteringStats } from '../../services/data_streams';
import { dataStreamService } from '../../services/data_streams';
import { MAX_CONCURRENT_DATASTREAM_OPERATIONS } from '../../constants';
import { appContextService } from '../../services';
import { FleetUnauthorizedError } from '../../errors';

import { getDataStreamsQueryMetadata } from './get_data_streams_query_metadata';

const MANAGED_BY = 'fleet';
const LEGACY_MANAGED_BY = 'ingest-manager';

interface ESDataStreamInfo {
  name: string;
  timestamp_field: {
    name: string;
  };
  indices: Array<{ index_name: string; index_uuid: string }>;
  generation: number;
  _meta?: {
    package?: {
      name: string;
    };
    managed_by?: string;
    managed?: boolean;
    [key: string]: any;
  };
  status: string;
  template: string;
  ilm_policy?: string;
  hidden: boolean;
}

export const getListHandler: RequestHandler = async (context, request, response) => {
  try {
    // Query datastreams as the current user as the Kibana internal user may not have all the required permission
    const { savedObjects, elasticsearch } = await context.core;
    const esClient = elasticsearch.client.asCurrentUser;

    const body: GetDataStreamsResponse = {
      data_streams: [],
    };

    const useMeteringApi = appContextService.getConfig()?.internal?.useMeteringApi;

    // Get matching data streams, their stats, and package SOs
    const [
      dataStreamsInfo,
      dataStreamStatsOrUndefined,
      dataStreamMeteringStatsorUndefined,
      packageSavedObjects,
    ] = await Promise.all([
      dataStreamService.getAllFleetDataStreams(esClient),
      useMeteringApi
        ? undefined
        : dataStreamService.getAllFleetDataStreamsStats(elasticsearch.client.asSecondaryAuthUser),
      useMeteringApi
        ? dataStreamService.getAllFleetMeteringStats(elasticsearch.client.asSecondaryAuthUser)
        : undefined,
      getPackageSavedObjects(savedObjects.client),
    ]);

    // managed_by property 'ingest-manager' added to allow for legacy data streams to be displayed
    // See https://github.com/elastic/elastic-agent/issues/654

    const filteredDataStreamsInfo = dataStreamsInfo.filter(
      (ds) => ds?._meta?.managed_by === MANAGED_BY || ds?._meta?.managed_by === LEGACY_MANAGED_BY
    );

    const dataStreamsInfoByName = keyBy<ESDataStreamInfo>(filteredDataStreamsInfo, 'name');

    let dataStreamsStatsByName: Dictionary<IndicesDataStreamsStatsDataStreamsStatsItem> = {};
    if (dataStreamStatsOrUndefined) {
      const filteredDataStreamsStats = dataStreamStatsOrUndefined.filter(
        (dss) => !!dataStreamsInfoByName[dss.data_stream]
      );
      dataStreamsStatsByName = keyBy(filteredDataStreamsStats, 'data_stream');
    }
    let dataStreamsMeteringStatsByName: Dictionary<MeteringStats> = {};
    if (dataStreamMeteringStatsorUndefined) {
      dataStreamsMeteringStatsByName = keyBy(dataStreamMeteringStatsorUndefined, 'name');
    }

    // Combine data stream info
    const dataStreams = merge(
      dataStreamsInfoByName,
      dataStreamsStatsByName,
      dataStreamsMeteringStatsByName
    );
    const dataStreamNames = keys(dataStreams);

    // Map package SOs
    const packageSavedObjectsByName = keyBy(packageSavedObjects.saved_objects, 'id');
    const packageMetadata: any = {};

    // Get dashboard information for all packages
    const dashboardIdsByPackageName = packageSavedObjects.saved_objects.reduce<
      Record<string, string[]>
    >((allDashboards, pkgSavedObject) => {
      const dashboards: string[] = [];
      (pkgSavedObject.attributes?.installed_kibana || []).forEach((o) => {
        if (o.type === KibanaSavedObjectType.dashboard) {
          dashboards.push(o.id);
        }
      });
      allDashboards[pkgSavedObject.id] = dashboards;
      return allDashboards;
    }, {});
    const allDashboardSavedObjectsResponse = await savedObjects.client.bulkGet<{
      title?: string;
    }>(
      Object.values(dashboardIdsByPackageName).flatMap((dashboardIds) =>
        dashboardIds.map((id) => ({
          id,
          type: KibanaSavedObjectType.dashboard,
          fields: ['title'],
        }))
      )
    );
    // Ignore dashboards not found
    const allDashboardSavedObjects = allDashboardSavedObjectsResponse.saved_objects.filter((so) => {
      if (so.error) {
        if (so.error.statusCode === 404) {
          return false;
        }
        throw so.error;
      }
      return true;
    });

    const allDashboardSavedObjectsById = keyBy(
      allDashboardSavedObjects,
      (dashboardSavedObject) => dashboardSavedObject.id
    );

    // Query additional information for each data stream
    const queryDataStreamInfo = async (dataStreamName: string) => {
      const dataStream = dataStreams[dataStreamName];

      const dataStreamResponse: DataStream = {
        index: dataStreamName,
        dataset: '',
        namespace: '',
        type: '',
        package: dataStream._meta?.package?.name || '',
        package_version: '',
        last_activity_ms: dataStream.maximum_timestamp, // overridden below if maxIngestedTimestamp agg returns a result
        size_in_bytes: dataStream.store_size_bytes || dataStream.size_in_bytes,
        // `store_size` should be available from ES due to ?human=true flag
        // but fallback to bytes just in case
        size_in_bytes_formatted:
          dataStream.store_size ||
          new ByteSizeValue(
            dataStream.store_size_bytes || dataStream.size_in_bytes || 0
          ).toString(),
        dashboards: [],
        serviceDetails: null,
      };

      const { maxIngested, namespace, dataset, type, serviceNames, environments } =
        await getDataStreamsQueryMetadata({ dataStreamName: dataStream.name, esClient });

      // some integrations e.g custom logs don't have event.ingested
      if (maxIngested) {
        dataStreamResponse.last_activity_ms = maxIngested;
      }

      if (serviceNames?.length === 1) {
        const serviceDetails = {
          serviceName: serviceNames[0],
          environment: environments?.length === 1 ? environments[0] : 'ENVIRONMENT_ALL',
        };
        dataStreamResponse.serviceDetails = serviceDetails;
      }

      dataStreamResponse.dataset = dataset;
      dataStreamResponse.namespace = namespace;
      dataStreamResponse.type = type;

      // Find package saved object
      const pkgName = dataStreamResponse.package;
      const pkgSavedObject = pkgName ? packageSavedObjectsByName[pkgName] : null;

      if (pkgSavedObject) {
        // if
        // - the data stream is associated with a package
        // - and the package has been installed through EPM
        // - and we didn't pick the metadata in an earlier iteration of this map()
        if (!packageMetadata[pkgName]) {
          // then pick the dashboards from the package saved object
          const packageDashboardIds = dashboardIdsByPackageName[pkgName] || [];
          const packageDashboards = packageDashboardIds.reduce<
            Array<{ id: string; title: string }>
          >((dashboards, dashboardId) => {
            const dashboard = allDashboardSavedObjectsById[dashboardId];
            if (dashboard) {
              dashboards.push({
                id: dashboard.id,
                title: dashboard.attributes.title || dashboard.id,
              });
            }
            return dashboards;
          }, []);

          packageMetadata[pkgName] = {
            version: pkgSavedObject.attributes?.version || '',
            dashboards: packageDashboards,
          };
        }

        // Set values from package information
        dataStreamResponse.package = pkgName;
        dataStreamResponse.package_version = packageMetadata[pkgName].version;
        dataStreamResponse.dashboards = packageMetadata[pkgName].dashboards;
      }

      return dataStreamResponse;
    };

    // Return final data streams objects sorted by last activity, descending
    // After filtering out data streams that are missing dataset/namespace/type/package fields
    body.data_streams = (
      await pMap(dataStreamNames, (dataStreamName) => queryDataStreamInfo(dataStreamName), {
        concurrency: MAX_CONCURRENT_DATASTREAM_OPERATIONS,
      })
    )
      .filter(({ dataset, namespace, type }) => dataset && namespace && type)
      .sort((a, b) => b.last_activity_ms - a.last_activity_ms);

    return response.ok({
      body,
    });
  } catch (err) {
    const isResponseError = err instanceof errors.ResponseError;
    if (isResponseError && err?.body?.error?.type === 'security_exception') {
      throw new FleetUnauthorizedError(
        `Not enough permissions to query datastreams: ${err.message}`
      );
    }
    throw err;
  }
};

export const getDeprecatedILMCheckHandler: RequestHandler = async (context, request, response) => {
  try {
    const { elasticsearch } = await context.core;
    const esClient = elasticsearch.client.asCurrentUser;

    const DEPRECATED_ILM_POLICY_TYPES = ['logs', 'metrics', 'synthetics'];

    // Fetch ILM policies and Fleet-managed component templates in parallel
    const [ilmResponse, ...componentTemplateResponses] = await Promise.all([
      esClient.ilm.getLifecycle(),
      ...DEPRECATED_ILM_POLICY_TYPES.map((dataStreamType) =>
        esClient.cluster.getComponentTemplate({
          name: `${dataStreamType}-*@package`,
        })
      ),
    ]);

    // Combine all component templates from the responses
    const allComponentTemplates = componentTemplateResponses.flatMap(
      (resp) => resp.component_templates
    );

    // Build a map of which ILM policies are used by which component templates
    const componentTemplatesByILMPolicy: Record<string, string[]> = {};

    allComponentTemplates.forEach((template) => {
      const ilmPolicyName = template.component_template?.template?.settings?.index?.lifecycle?.name;

      if (ilmPolicyName) {
        if (!componentTemplatesByILMPolicy[ilmPolicyName]) {
          componentTemplatesByILMPolicy[ilmPolicyName] = [];
        }
        componentTemplatesByILMPolicy[ilmPolicyName].push(template.name);
      }
    });

    // Check each deprecated policy type to see if we should show a callout
    const deprecatedILMPolicies: Array<{
      policyName: string;
      version: number;
      componentTemplates: string[];
    }> = [];

    for (const policyType of DEPRECATED_ILM_POLICY_TYPES) {
      const deprecatedPolicyName = policyType;
      const lifecyclePolicyName = `${policyType}@lifecycle`;

      // Check if the deprecated policy is being used by component templates
      const componentTemplatesUsingDeprecated = componentTemplatesByILMPolicy[deprecatedPolicyName];
      if (!componentTemplatesUsingDeprecated || componentTemplatesUsingDeprecated.length === 0) {
        // Not using deprecated policy, skip
        continue;
      }

      const deprecatedPolicy = ilmResponse[deprecatedPolicyName];
      const lifecyclePolicy = ilmResponse[lifecyclePolicyName];

      // Case 1: Using deprecated policy but @lifecycle doesn't exist → show callout
      if (!lifecyclePolicy) {
        if (deprecatedPolicy) {
          deprecatedILMPolicies.push({
            policyName: deprecatedPolicyName,
            version: deprecatedPolicy.version,
            componentTemplates: componentTemplatesUsingDeprecated,
          });
        }
        continue;
      }

      // Case 2: Both policies exist
      // Don't show callout if both are unmodified (version 1) - auto-migration will happen
      if (deprecatedPolicy && deprecatedPolicy.version === 1 && lifecyclePolicy.version === 1) {
        // Both unmodified, auto-migration will handle this, skip
        continue;
      }

      // Case 3: At least one policy is modified (version > 1) → show callout
      if (deprecatedPolicy && (deprecatedPolicy.version > 1 || lifecyclePolicy.version > 1)) {
        deprecatedILMPolicies.push({
          policyName: deprecatedPolicyName,
          version: deprecatedPolicy.version,
          componentTemplates: componentTemplatesUsingDeprecated,
        });
      }
    }

    return response.ok({
      body: {
        deprecatedILMPolicies,
      },
    });
  } catch (err) {
    const isResponseError = err instanceof errors.ResponseError;
    if (isResponseError && err?.body?.error?.type === 'security_exception') {
      throw new FleetUnauthorizedError(
        `Not enough permissions to query ILM policies: ${err.message}`
      );
    }
    throw err;
  }
};
