/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { NewPackagePolicy, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';

import type { Subscription } from 'rxjs';
import {
  getInternalSavedObjectsClient,
  getInternalSavedObjectsClientForSpaceId,
} from './utils/get_internal_saved_object_client';
import { upgradeIntegration } from './utils/upgrade_integration';
import type { PackSavedObject } from './common/types';
import { updateGlobalPacksCreateCallback } from './lib/update_global_packs';
import { packSavedObjectType } from '../common/types';
import { createConfig } from './create_config';
import type { OsqueryPluginSetup, OsqueryPluginStart, SetupPlugins, StartPlugins } from './types';
import { defineRoutes } from './routes';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';
import { initSavedObjects } from './saved_objects';
import type { OsqueryAppContext } from './lib/osquery_app_context_services';
import { OsqueryAppContextService } from './lib/osquery_app_context_services';
import type { ConfigType } from '../common/config';
import { OSQUERY_INTEGRATION_NAME } from '../common';
import {
  getPackagePolicyDeleteCallback,
  getAgentPolicyPostUpdateCallback,
} from './lib/fleet_integration';
import { TelemetryEventsSender } from './lib/telemetry/sender';
import { TelemetryReceiver } from './lib/telemetry/receiver';
import { initializeTransformsIndices } from './create_indices/create_transforms_indices';
import { initializeTransforms } from './create_transforms/create_transforms';
import { createDataViews } from './create_data_views';

import { registerFeatures } from './utils/register_features';
import { CASE_ATTACHMENT_TYPE_ID } from '../common/constants';
import { createActionService } from './handlers/action/create_action_service';
import { getLiveQueriesSkillTools } from './skills/live_queries_skill';
import { Skill, type SkillTool } from '@kbn/agent-skills-common';

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private readonly logger: Logger;
  private context: PluginInitializerContext;
  private readonly osqueryAppContextService = new OsqueryAppContextService();
  private readonly telemetryReceiver: TelemetryReceiver;
  private readonly telemetryEventsSender: TelemetryEventsSender;
  private licenseSubscription: Subscription | null = null;
  private createActionService: ReturnType<typeof createActionService> | null = null;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.context = initializerContext;
    this.logger = initializerContext.logger.get();
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
    this.telemetryReceiver = new TelemetryReceiver(this.logger);
  }

  public setup(core: CoreSetup<StartPlugins, OsqueryPluginStart>, plugins: SetupPlugins) {
    this.logger.debug('osquery: Setup');
    const config = createConfig(this.initializerContext);

    registerFeatures(plugins.features);

    const router = core.http.createRouter<DataRequestHandlerContext>();

    const osqueryContext: OsqueryAppContext = {
      logFactory: this.context.logger,
      getStartServices: core.getStartServices,
      service: this.osqueryAppContextService,
      config: (): ConfigType => config,
      security: plugins.security,
      telemetryEventsSender: this.telemetryEventsSender,
      licensing: plugins.licensing,
    };

    initSavedObjects(core.savedObjects);

    // TODO: We do not pass so client here.
    this.createActionService = createActionService(osqueryContext);

    core
      .getStartServices()
      .then(([{ elasticsearch }, depsStart]) => {
        const osquerySearchStrategy = osquerySearchStrategyProvider(
          depsStart.data,
          elasticsearch.client
        );

        plugins.data.search.registerSearchStrategy('osquerySearchStrategy', osquerySearchStrategy);
        defineRoutes(router, osqueryContext);
      })
      .catch(() => {
        // it shouldn't reject, but just in case
      });

    this.telemetryEventsSender.setup(this.telemetryReceiver, plugins.taskManager, core.analytics);

    plugins.cases?.attachmentFramework.registerExternalReference({ id: CASE_ATTACHMENT_TYPE_ID });

    // Register osQuery skill
    if (plugins.agentSkills) {
      try {
        const tools = getLiveQueriesSkillTools({
          coreSetup: core,
          osqueryContext,
        });

        class OsQuerySkill extends Skill {
          readonly id = 'osquery.osquery';
          readonly name = 'osQuery';
          readonly shortDescription = 'Always, read this guide before using osquery to execute commands';
          readonly files = [
            {
              id: 'osquery.osquery',
              name: 'osQuery Guide',
              shortDescription: 'Always call this before using osquery to execute commands',
              content: `osQuery is a powerful SQL-based operating system instrumentation framework that allows you to query system information and events using SQL-like syntax. It provides a unified interface to access low-level operating system data across different platforms (Windows, macOS, Linux).

With osQuery, you can:
- Query system information like running processes, installed software, network connections, and file system details
- Monitor system events and changes in real-time
- Perform security investigations and compliance checks
- Gather endpoint telemetry data for analysis

Example osQuery SQL queries:
- List all running processes: SELECT * FROM processes;
- Check installed applications: SELECT * FROM apps;
- View network connections: SELECT * FROM listening_ports;
- Monitor file changes: SELECT * FROM file_events WHERE path LIKE '/etc/%';
- Query system information: SELECT * FROM system_info;
- Find processes by name: SELECT name, pid, path FROM processes WHERE name LIKE '%chrome%';
- List all users: SELECT * FROM users;
- Check listening ports: SELECT * FROM listening_ports;

=== osquery.create_live_query ===

Create and execute an Osquery live query on selected agents. This skill returns an action_id and a queries array containing query_action_ids that you'll need for retrieving results.

Parameters:
- query (string, optional): Osquery SQL query to execute directly
- queries (array, optional): Array of query objects to execute, each containing:
  - id (string, required): Unique identifier for the query
  - query (string, required): The SQL query to execute
  - timeout (number, optional): Query timeout in seconds
  - ecs_mapping (object, optional): ECS field mapping for this specific query
- saved_query_id (string, optional): ID of a saved query to execute
- pack_id (string, optional): ID of a pack to execute
- agent_all (boolean, optional): Run query on all agents
- agent_ids (array of strings, optional): List of specific agent IDs to run query on
- agent_platforms (array of strings, optional): List of agent platforms to target (e.g., ["linux", "windows", "darwin"])
- agent_policy_ids (array of strings, optional): List of agent policy IDs to run query on
- ecs_mapping (object, optional): ECS field mapping for query results
- alert_ids (array of strings, optional): Associated alert IDs for context
- case_ids (array of strings, optional): Associated case IDs for context
- event_ids (array of strings, optional): Associated event IDs for context

Note: You must specify at least one agent selection method (agent_all, agent_ids, agent_platforms, or agent_policy_ids). You must also provide either a query, queries array, saved_query_id, or pack_id.

Example usage:
1. Run a simple query on all agents:
   tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"query":"SELECT * FROM processes","agent_all":true}})

2. Run a query on specific agents:
   tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"query":"SELECT * FROM users","agent_ids":["<agent_uuid>"]}})

3. Run a query on agents with specific platform:
   tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"query":"SELECT name, pid, path FROM processes WHERE name LIKE '%chrome%'","agent_platforms":["linux"]}})

4. Query system info on specific agents:
   tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"query":"SELECT * FROM system_info","agent_ids":["<agent_uuid>"]}})

5. Run a saved query by ID:
   tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"saved_query_id":"<saved_query_id>","agent_all":true}})

6. Run a pack on agents with specific policy:
   tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"pack_id":"<pack_id>","agent_policy_ids":["<policy_id>"]}})

Response format:
The skill returns an object with:
- action_id: The main live query action ID (use this for get_live_query_results)
- @timestamp: Timestamp when the query was created
- expiration: Expiration timestamp for the query
- agents: Array of agent information
- queries: Array of query objects, each containing:
  - action_id: Query-specific action ID (use these in query_action_ids for get_live_query_results)
  - Other query metadata

=== osquery.get_live_query_results ===

Retrieve results from a previously executed live query. This skill will wait for all queries to complete before returning results by default. It polls for completion and verifies that results are indexed before returning.

Parameters:
- action_id (string, required): The main live query action ID returned from create_live_query
- query_action_ids (array of strings, required): Array of query-specific action IDs to fetch results for. Each query in a live query action has its own action_id. These can be obtained from the 'queries' array in the create_live_query response.
- kuery (string, optional): KQL query to filter results
- page (number, optional): Page number for pagination (default: 0)
- pageSize (number, optional): Number of results per page (default: 100)
- sort (string, optional): Field to sort by (default: '@timestamp')
- sortOrder (string, optional): Sort order, either 'asc' or 'desc' (default: 'desc')
- startDate (string, optional): Start date for filtering results. If not provided, uses the action's timestamp.
- timeout_seconds (number, optional): Maximum time to wait for results in seconds (default: 300 seconds / 5 minutes)
- poll_interval_seconds (number, optional): How often to check for results in seconds (default: 5 seconds)
- wait_for_completion (boolean, optional): Whether to wait for the query to complete before returning results (default: true). Set to false to return immediately without waiting.

Example usage:
1. Wait for results from a single query:
   tool("invoke_skill", {"skillId":"osquery.get_live_query_results","params":{"action_id":"<action_id>","query_action_ids":["<query_action_id>"]}})

2. Get results from multiple queries:
   tool("invoke_skill", {"skillId":"osquery.get_live_query_results","params":{"action_id":"<action_id>","query_action_ids":["<query_action_id_1>","<query_action_id_2>"]}})

3. Get results with custom timeout:
   tool("invoke_skill", {"skillId":"osquery.get_live_query_results","params":{"action_id":"<action_id>","query_action_ids":["<query_action_id>"],"timeout_seconds":60}})

4. Get results immediately without waiting:
   tool("invoke_skill", {"skillId":"osquery.get_live_query_results","params":{"action_id":"<action_id>","query_action_ids":["<query_action_id>"],"wait_for_completion":false}})

5. Get results with pagination and filtering:
   tool("invoke_skill", {"skillId":"osquery.get_live_query_results","params":{"action_id":"<action_id>","query_action_ids":["<query_action_id>"],"page":0,"pageSize":50,"kuery":"agent.name: *","sort":"@timestamp","sortOrder":"desc"}})

Response format:
The skill returns an object with:
- action_id: The main live query action ID
- status: Overall status ('completed' or 'running')
- is_completed: Boolean indicating if all queries are complete
- is_expired: Boolean indicating if the action has expired
- queries: Array of query result objects, each containing:
  - query_action_id: The query-specific action ID
  - status: Query status ('completed' or 'running')
  - agents: Object with agent statistics:
    - total: Total number of agents
    - responded: Number of agents that responded
    - successful: Number of successful responses
    - failed: Number of failed responses
    - pending: Number of pending responses
  - results: Object with result data:
    - total: Total number of results
    - page: Current page number
    - page_size: Number of results per page
    - data: Array of result records

IMPORTANT WORKFLOW:
1. First, use osquery.create_live_query to create and execute a query. This returns an action_id and a queries array.
2. Extract the query_action_ids from the queries array in the response.
3. Then, use osquery.get_live_query_results with the action_id and query_action_ids to wait for and retrieve the results.

The get_live_query_results skill will automatically wait for all agents to respond and verify that results are indexed before returning data. You can customize the timeout and polling interval if needed, or set wait_for_completion to false to return immediately.

osQuery queries are executed on endpoints and return structured data that can be analyzed, stored, and used for security monitoring, compliance, and system administration.`,
              filePath: '/skills/osquery/osquery.md',
            },
          ];
          get tools(): SkillTool[] {
            return tools;
          }
        }

        plugins.agentSkills.registerSkill(new OsQuerySkill());
        this.logger.info('Registered osquery.osquery skill');
      } catch (error) {
        this.logger.error(`Error registering osQuery skill: ${error}`);
      }
    }

    return {
      createActionService: this.createActionService,
    };
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    this.logger.debug('osquery: Started');
    const registerIngestCallback = plugins.fleet?.registerExternalCallback;
    this.osqueryAppContextService.start({
      ...plugins.fleet,
      ruleRegistryService: plugins.ruleRegistry,
      // @ts-expect-error update types
      config: this.config!,
      logger: this.logger,
      registerIngestCallback,
      spacesService: plugins.spaces?.spacesService,
    });

    this.telemetryReceiver.start(core, this.osqueryAppContextService);

    this.telemetryEventsSender.start(plugins.taskManager, this.telemetryReceiver);

    plugins.fleet
      ?.fleetSetupCompleted()
      .then(async () => {
        const packageInfo = await plugins.fleet?.packageService.asInternalUser.getInstallation(
          OSQUERY_INTEGRATION_NAME
        );
        const client = await getInternalSavedObjectsClient(core);

        const esClient = core.elasticsearch.client.asInternalUser;
        const dataViewsService = await plugins.dataViews.dataViewsServiceFactory(
          client,
          esClient,
          undefined,
          true
        );

        // If package is installed we want to make sure all needed assets are installed
        if (packageInfo) {
          await this.initialize(core, dataViewsService);
        }

        // Upgrade integration into 1.6.0 and rollover if found 'generic' dataset - we do not want to wait for it
        upgradeIntegration({ packageInfo, client, esClient, logger: this.logger }).catch(() => {
          // we do not want to wait for it
        });

        if (registerIngestCallback) {
          registerIngestCallback(
            'packagePolicyCreate',
            async (
              newPackagePolicy: NewPackagePolicy,
              soClient: SavedObjectsClientContract
            ): Promise<UpdatePackagePolicy> => {
              if (newPackagePolicy.package?.name === OSQUERY_INTEGRATION_NAME) {
                await this.initialize(core, dataViewsService);
                const allPacks = await client
                  .find<PackSavedObject>({
                    type: packSavedObjectType,
                  })
                  .then((data) => ({
                    ...data,
                    saved_objects: data.saved_objects.map((pack) => ({
                      ...pack.attributes,
                      saved_object_id: pack.id,
                      references: pack.references,
                    })),
                  }));

                if (allPacks.saved_objects) {
                  const spaceScopedClient = getInternalSavedObjectsClientForSpaceId(
                    core,
                    soClient.getCurrentNamespace()
                  );

                  return updateGlobalPacksCreateCallback(
                    newPackagePolicy,
                    spaceScopedClient,
                    allPacks.saved_objects,
                    this.osqueryAppContextService
                  );
                }
              }

              return newPackagePolicy;
            }
          );

          registerIngestCallback('packagePolicyPostDelete', getPackagePolicyDeleteCallback(client));
          registerIngestCallback('agentPolicyPostUpdate', getAgentPolicyPostUpdateCallback(core));
        }
      })
      .catch(() => {
        // it shouldn't reject, but just in case
      });

    return {};
  }

  public stop() {
    this.logger.debug('osquery: Stopped');
    this.telemetryEventsSender.stop();
    this.osqueryAppContextService.stop();
    this.licenseSubscription?.unsubscribe();
    this.createActionService?.stop();
  }

  async initialize(core: CoreStart, dataViewsService: DataViewsService): Promise<void> {
    this.logger.debug('initialize');
    await initializeTransformsIndices(core.elasticsearch.client.asInternalUser, this.logger);
    await initializeTransforms(core.elasticsearch.client.asInternalUser, this.logger);
    await createDataViews(dataViewsService);
  }
}
