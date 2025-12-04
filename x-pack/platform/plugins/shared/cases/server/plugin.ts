/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type IContextProvider,
  type KibanaRequest,
  type Logger,
  type PluginInitializerContext,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  SavedObjectsClient,
} from '@kbn/core/server';

import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { APP_ID, CASE_SAVED_OBJECT } from '../common/constants';

import type { CasesClient } from './client';
import type {
  CasesRequestHandlerContext,
  CasesServerSetup,
  CasesServerSetupDependencies,
  CasesServerStart,
  CasesServerStartDependencies,
} from './types';
import { CasesClientFactory } from './client/factory';
import { getCasesKibanaFeatures } from './features';
import { registerRoutes } from './routes/api/register_routes';
import { getExternalRoutes } from './routes/api/get_external_routes';
import { createCasesTelemetry, scheduleCasesTelemetryTask } from './telemetry';
import { getInternalRoutes } from './routes/api/get_internal_routes';
import { PersistableStateAttachmentTypeRegistry } from './attachment_framework/persistable_state_registry';
import { ExternalReferenceAttachmentTypeRegistry } from './attachment_framework/external_reference_registry';
import { UserProfileService } from './services';
import {
  LICENSING_CASE_ASSIGNMENT_FEATURE,
  LICENSING_CASE_OBSERVABLES_FEATURE,
} from './common/constants';
import { registerInternalAttachments } from './internal_attachments';
import { registerCaseFileKinds } from './files';
import type { ConfigType } from './config';
import { registerConnectorTypes } from './connectors';
import { registerSavedObjects } from './saved_object_types';
import type { ServerlessProjectType } from '../common/constants/types';
import { Skill, type SkillTool } from '@kbn/agent-skills-common';

import { IncrementalIdTaskManager } from './tasks/incremental_id/incremental_id_task_manager';
import { createCasesAnalyticsIndexes, registerCasesAnalyticsIndexesTasks } from './cases_analytics';
import { scheduleCAISchedulerTask } from './cases_analytics/tasks/scheduler_task';

export class CasePlugin
  implements
    Plugin<
      CasesServerSetup,
      CasesServerStart,
      CasesServerSetupDependencies,
      CasesServerStartDependencies
    >
{
  private readonly caseConfig: ConfigType;
  private readonly logger: Logger;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private clientFactory: CasesClientFactory;
  private securityPluginSetup?: SecurityPluginSetup;
  private lensEmbeddableFactory?: LensServerPluginSetup['lensEmbeddableFactory'];
  private persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  private externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  private userProfileService: UserProfileService;
  private incrementalIdTaskManager?: IncrementalIdTaskManager;
  private readonly isServerless: boolean;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.caseConfig = initializerContext.config.get<ConfigType>();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.logger = this.initializerContext.logger.get();
    this.clientFactory = new CasesClientFactory(this.logger);
    this.persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
    this.externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
    this.userProfileService = new UserProfileService(this.logger);
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: CoreSetup<CasesServerStartDependencies>,
    plugins: CasesServerSetupDependencies
  ): CasesServerSetup {
    this.logger.debug(
      `Setting up Case Workflow with core contract [${Object.keys(
        core
      )}] and plugins [${Object.keys(plugins)}]`
    );

    registerInternalAttachments(
      this.externalReferenceAttachmentTypeRegistry,
      this.persistableStateAttachmentTypeRegistry
    );

    registerCaseFileKinds(this.caseConfig.files, plugins.files, core.security.fips.isEnabled());
    registerCasesAnalyticsIndexesTasks({
      taskManager: plugins.taskManager,
      logger: this.logger,
      core,
      analyticsConfig: this.caseConfig.analytics,
    });

    this.securityPluginSetup = plugins.security;
    this.lensEmbeddableFactory = plugins.lens.lensEmbeddableFactory;

    if (this.caseConfig.stack.enabled) {
      // V1 is deprecated, but has to be maintained for the time being
      // https://github.com/elastic/kibana/pull/186800#issue-2369812818
      const casesFeatures = getCasesKibanaFeatures();
      plugins.features.registerKibanaFeature(casesFeatures.v1);
      plugins.features.registerKibanaFeature(casesFeatures.v2);
      plugins.features.registerKibanaFeature(casesFeatures.v3);
    }

    registerSavedObjects({
      core,
      logger: this.logger,
      persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
      lensEmbeddableFactory: this.lensEmbeddableFactory,
    });

    core.http.registerRouteHandlerContext<CasesRequestHandlerContext, 'cases'>(
      APP_ID,
      this.createRouteHandlerContext({
        core,
      })
    );

    if (plugins.taskManager) {
      if (plugins.usageCollection) {
        createCasesTelemetry({
          core,
          taskManager: plugins.taskManager,
          usageCollection: plugins.usageCollection,
          logger: this.logger,
          kibanaVersion: this.kibanaVersion,
        });
      }

      if (this.caseConfig.incrementalId.enabled) {
        this.incrementalIdTaskManager = new IncrementalIdTaskManager(
          plugins.taskManager,
          this.caseConfig.incrementalId,
          this.logger,
          plugins.usageCollection
        );
      }
    }

    const router = core.http.createRouter<CasesRequestHandlerContext>();
    const telemetryUsageCounter = plugins.usageCollection?.createUsageCounter(APP_ID);

    registerRoutes({
      router,
      routes: [
        ...getExternalRoutes({ isServerless: this.isServerless, docLinks: core.docLinks }),
        ...getInternalRoutes(this.userProfileService),
      ],
      logger: this.logger,
      kibanaVersion: this.kibanaVersion,
      telemetryUsageCounter,
    });

    plugins.licensing.featureUsage.register(LICENSING_CASE_ASSIGNMENT_FEATURE, 'platinum');
    plugins.licensing.featureUsage.register(LICENSING_CASE_OBSERVABLES_FEATURE, 'platinum');

    const getCasesClient = async (request: KibanaRequest): Promise<CasesClient> => {
      const [coreStart] = await core.getStartServices();
      return this.getCasesClientWithRequest(coreStart)(request);
    };

    const getSpaceId = (request?: KibanaRequest) => {
      if (!request) {
        return DEFAULT_SPACE_ID;
      }

      return plugins.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
    };

    const serverlessProjectType = this.isServerless
      ? (plugins.cloud?.serverless.projectType as ServerlessProjectType)
      : undefined;

    registerConnectorTypes({
      actions: plugins.actions,
      alerting: plugins.alerting,
      core,
      logger: this.logger,
      getCasesClient,
      getSpaceId,
      serverlessProjectType,
    });

    // Register Cases skill
    if (plugins.agentSkills) {
      try {
        class CasesSkill extends Skill {
          readonly id = 'cases.cases';
          readonly name = 'Cases';
          readonly shortDescription = 'Always read this guide before using cases to manage incidents';
          readonly files = [
            {
              id: 'cases.cases',
              name: 'Cases Guide',
              shortDescription: 'Guide for using cases',
              content: `Cases provide a centralized way to track, manage, and resolve security and operational incidents. Cases can be associated with alerts, have assignees, tags, severity levels, and custom fields.

=== cases.create_case ===

Create a new case for tracking and managing issues. Cases can be associated with alerts, have assignees, tags, severity levels, and custom fields.

Parameters:
- title (string, required): Title of the case (1-160 characters)
- description (string, required): Description of the case (1-30000 characters)
- owner (string, required): The owner/plugin identifier (e.g., "securitySolution", "observability")
- tags (array of strings, optional): Tags to associate with the case
- severity (enum, optional): Severity level - 'low', 'medium', 'high', or 'critical'
- category (string, optional): Category of the case
- assignees (array of objects, optional): Users assigned to the case. Each object contains:
  - uid (string, required): User UID
- customFields (array of objects, optional): Custom field values. Each object contains:
  - key (string, required): Custom field key
  - type (string, required): Custom field type
  - value (any, required): Custom field value
- connector (object, optional): External connector configuration. Contains:
  - id (string, required): Connector ID
  - name (string, required): Connector name
  - type (string, required): Connector type
  - fields (object, optional): Connector-specific fields
- settings (object, optional): Case settings. Contains:
  - syncAlerts (boolean, optional): Whether to sync alerts with the case

Example usage:
1. Create a basic security case:
   tool("invoke_skill", {"skillId":"cases.create_case","params":{"title":"Suspicious login activity","description":"Multiple failed login attempts detected","owner":"securitySolution"}})

2. Create an observability case:
   tool("invoke_skill", {"skillId":"cases.create_case","params":{"title":"Service outage","description":"API service is not responding","owner":"observability"}})

3. Create a case with severity and tags:
   tool("invoke_skill", {"skillId":"cases.create_case","params":{"title":"Critical incident","description":"Production database unavailable","owner":"securitySolution","severity":"critical","tags":["incident","production"]}})

4. Create a case with assignees:
   tool("invoke_skill", {"skillId":"cases.create_case","params":{"title":"Investigate malware","description":"Potential malware detected on endpoint","owner":"securitySolution","severity":"high","assignees":[{"uid":"<user_uid>"}]}})

Response format:
Returns a case object with id, title, description, owner, status, severity, tags, assignees, and other metadata.

=== cases.search_cases ===

Search and filter cases by various criteria including owner, tags, status, severity, assignees, and more.

Parameters:
- owner (string, optional): Filter by owner/plugin identifier
- tags (array of strings, optional): Filter by tags
- status (enum, optional): Filter by status - 'open', 'in-progress', or 'closed'
- severity (enum, optional): Filter by severity - 'low', 'medium', 'high', or 'critical'
- assignees (array of strings, optional): Filter by assignee UIDs
- reporters (array of strings, optional): Filter by reporter UIDs
- category (string, optional): Filter by category
- page (number, optional): Page number for pagination
- perPage (number, optional): Number of results per page
- sortField (string, optional): Field to sort by
- sortOrder (enum, optional): Sort order - 'asc' or 'desc'

Example usage:
1. Search all cases with default pagination:
   tool("invoke_skill", {"skillId":"cases.search_cases","params":{}})

2. Search for open security cases:
   tool("invoke_skill", {"skillId":"cases.search_cases","params":{"owner":"securitySolution","status":"open"}})

3. Search for high severity cases:
   tool("invoke_skill", {"skillId":"cases.search_cases","params":{"severity":"high","perPage":20}})

4. Search cases by tags:
   tool("invoke_skill", {"skillId":"cases.search_cases","params":{"tags":["incident"],"sortField":"created_at","sortOrder":"desc"}})

5. Search cases assigned to a user:
   tool("invoke_skill", {"skillId":"cases.search_cases","params":{"assignees":["<user_uid>"],"status":"in-progress"}})

Response format:
Returns a paginated result object with cases array, total count, page, and perPage information.

=== cases.get_case ===

Retrieve a specific case by its ID with all details including comments, attachments, and metadata.

Parameters:
- id (string, required): Case ID to retrieve

Example usage:
1. Get a case by ID:
   tool("invoke_skill", {"skillId":"cases.get_case","params":{"id":"<case_id>"}})

Response format:
Returns a complete case object with all details including comments, attachments, and metadata.

=== cases.update_case ===

Update an existing case. Requires the case version for optimistic concurrency control. Can update title, description, status, severity, tags, assignees, and category.

Parameters:
- id (string, required): Case ID to update
- version (string, required): Case version (required for optimistic concurrency control)
- title (string, optional): Updated title
- description (string, optional): Updated description
- status (enum, optional): Updated status - 'open', 'in-progress', or 'closed'
- severity (enum, optional): Updated severity - 'low', 'medium', 'high', or 'critical'
- tags (array of strings, optional): Updated tags
- assignees (array of objects, optional): Updated assignees. Each object contains:
  - uid (string, required): User UID
- category (string, optional): Updated category

Example usage:
1. Update case status to in-progress:
   tool("invoke_skill", {"skillId":"cases.update_case","params":{"id":"<case_id>","version":"<case_version>","status":"in-progress"}})

2. Update case severity to critical:
   tool("invoke_skill", {"skillId":"cases.update_case","params":{"id":"<case_id>","version":"<case_version>","severity":"critical"}})

3. Add tags to a case:
   tool("invoke_skill", {"skillId":"cases.update_case","params":{"id":"<case_id>","version":"<case_version>","tags":["incident","high-priority"]}})

4. Close a case:
   tool("invoke_skill", {"skillId":"cases.update_case","params":{"id":"<case_id>","version":"<case_version>","status":"closed"}})

5. Assign users to a case:
   tool("invoke_skill", {"skillId":"cases.update_case","params":{"id":"<case_id>","version":"<case_version>","assignees":[{"uid":"<user_uid>"}]}})

Response format:
Returns the updated case object.

=== cases.delete_case ===

Delete one or more cases by their IDs. This will also delete all comments and attachments associated with the cases.

Parameters:
- ids (array of strings, required): Array of case IDs to delete

Example usage:
1. Delete a single case:
   tool("invoke_skill", {"skillId":"cases.delete_case","params":{"ids":["<case_id>"]}})

2. Delete multiple cases:
   tool("invoke_skill", {"skillId":"cases.delete_case","params":{"ids":["<case_id_1>","<case_id_2>"]}})

Response format:
Returns an object with success status and deletedIds array.`,
              filePath: '/skills/cases/cases.md',
            },
          ];
          readonly tools: SkillTool[] = [];
        }

        plugins.agentSkills.registerSkill(new CasesSkill());
        this.logger.info('Registered cases.cases skill');
      } catch (error) {
        this.logger.error(`Error registering cases skill: ${error}`);
      }
    }

    return {
      attachmentFramework: {
        registerExternalReference: (externalReferenceAttachmentType) => {
          this.externalReferenceAttachmentTypeRegistry.register(externalReferenceAttachmentType);
        },
        registerPersistableState: (persistableStateAttachmentType) => {
          this.persistableStateAttachmentTypeRegistry.register(persistableStateAttachmentType);
        },
      },
      config: this.caseConfig,
    };
  }

  public start(core: CoreStart, plugins: CasesServerStartDependencies): CasesServerStart {
    this.logger.debug(`Starting Case Workflow`);

    if (plugins.taskManager) {
      scheduleCasesTelemetryTask(plugins.taskManager, this.logger);

      if (this.caseConfig.incrementalId.enabled) {
        void this.incrementalIdTaskManager?.setupIncrementIdTask(plugins.taskManager, core);
      }
      if (this.caseConfig.analytics.index?.enabled) {
        const internalSavedObjectsRepository = core.savedObjects.createInternalRepository([
          CASE_SAVED_OBJECT,
        ]);
        const internalSavedObjectsClient = new SavedObjectsClient(internalSavedObjectsRepository);
        scheduleCAISchedulerTask({
          taskManager: plugins.taskManager,
          logger: this.logger,
        }).catch(() => {}); // it shouldn't reject, but just in case
        createCasesAnalyticsIndexes({
          esClient: core.elasticsearch.client.asInternalUser,
          logger: this.logger,
          isServerless: this.isServerless,
          taskManager: plugins.taskManager,
          savedObjectsClient: internalSavedObjectsClient,
        }).catch(() => {}); // it shouldn't reject, but just in case
      }
    }

    this.userProfileService.initialize({
      spaces: plugins.spaces,
      // securityPluginSetup will be set to a defined value in the setup() function
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      securityPluginSetup: this.securityPluginSetup!,
      securityPluginStart: plugins.security,
      licensingPluginStart: plugins.licensing,
    });

    this.clientFactory.initialize({
      // securityPluginSetup will be set to a defined value in the setup() function
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      securityPluginSetup: this.securityPluginSetup!,
      securityPluginStart: plugins.security,
      securityServiceStart: core.security,
      spacesPluginStart: plugins.spaces,
      featuresPluginStart: plugins.features,
      actionsPluginStart: plugins.actions,
      licensingPluginStart: plugins.licensing,
      /**
       * Lens will be always defined as
       * it is declared as required plugin in kibana.json
       */
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      lensEmbeddableFactory: this.lensEmbeddableFactory!,
      persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
      externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
      notifications: plugins.notifications,
      ruleRegistry: plugins.ruleRegistry,
      filesPluginStart: plugins.files,
    });

    const casesServerStart: CasesServerStart = {
      getCasesClientWithRequest: this.getCasesClientWithRequest(core),
      getExternalReferenceAttachmentTypeRegistry: () =>
        this.externalReferenceAttachmentTypeRegistry,
      getPersistableStateAttachmentTypeRegistry: () => this.persistableStateAttachmentTypeRegistry,
      config: this.caseConfig,
    };


    return casesServerStart;
  }

  public stop() {
    this.logger.debug(`Stopping Case Workflow`);
  }

  private createRouteHandlerContext = ({
    core,
  }: {
    core: CoreSetup;
  }): IContextProvider<CasesRequestHandlerContext, 'cases'> => {
    return async (context, request, response) => {
      return {
        getCasesClient: async () => {
          const [{ savedObjects }] = await core.getStartServices();
          const coreContext = await context.core;

          return this.clientFactory.create({
            request,
            scopedClusterClient: coreContext.elasticsearch.client.asCurrentUser,
            savedObjectsService: savedObjects,
          });
        },
      };
    };
  };

  private getCasesClientWithRequest =
    (core: CoreStart) =>
    async (request: KibanaRequest): Promise<CasesClient> => {
      const client = core.elasticsearch.client;

      return this.clientFactory.create({
        request,
        scopedClusterClient: client.asScoped(request).asCurrentUser,
        savedObjectsService: core.savedObjects,
      });
    };
}
