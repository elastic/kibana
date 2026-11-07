/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CoreSetup,
  type CoreStart,
  type KibanaRequest,
  type Logger,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgenticInvestigationsConfig } from './config';
import { resolveLinkActor } from './escalations/services/link_actor';
import { registerFeatures } from './features';
import { CaseBridgeService, getEventActorForUser } from './cases_bridge/case_bridge_service';
import {
  createInvestigationCaseAttachmentType,
  createNextUpCaseAttachmentTypes,
} from './cases_bridge/attachment_type';
import { registerCaseDecisionRoutes } from './cases_bridge/decision_routes';
import { WorkerCaseService } from './cases_bridge/worker_case_service';
import { registerCaseBridgeConversationEvents } from './cases_bridge/conversation_events';
import { registerCaseBridgeRoutes } from './cases_bridge/routes';
import { subscribeToCaseEvents } from './cases_bridge/subscriber';
import { registerCaseBridgeUiSettings } from './cases_bridge/ui_settings';
import { getAiInvestigationTemplate } from './cases_bridge/system_template';
import {
  ALERTZERO_CASE_OWNER,
  CLOSE_CASE_WHEN_INVESTIGATIONS_CLOSE_SETTING,
  OPEN_CASES_FOR_INVESTIGATIONS_SETTING,
  OPEN_CASES_FOR_INVESTIGATIONS_VISIBILITY_SETTING,
  type CaseVisibility,
} from '../common/cases_bridge';
import type { InvestigationsClient } from './investigations/services/investigations_client';
import type { FindingsWriter } from './findings/findings_writer';
import { registerImpactAttachment } from './impact/attachments';
import { registerImpactRoutes } from './impact/routes/register_routes';
import { createInvestigationsPrivilegesChecker } from './investigations/services/check_investigations_privileges';
import { createImpactClient } from './impact/services/impact_client';
import { createEntityStoreNameLookup } from './impact/services/entity_store_names';
import { ImpactPillsService } from './impact/services/impact_pills_service';
import { ImpactService } from './impact/services/impact_service';
import { registerImpactStepDefinitions } from './impact/step_types';
import { registerInvestigationStepDefinitions } from './investigations/step_types';
import { registerWorkflowExecutionStepDefinitions } from './workflow_execution/step_types';
import { createImpactStorageClient } from './impact/storage/impact_storage';
import { createSetImpactTool } from './impact/tools/set_impact_tool';
import { registerSubjectAttachment, subjectAttachment } from './subjects/attachments';
import { SubjectsService } from './subjects/services/subjects_service';
import {
  createSubjectClaimStorageClient,
  SubjectClaimsService,
} from './subjects/services/subject_claims_service';
import { createSubjectsClient } from './subjects/services/subjects_client';
import { createFindingsWriter } from './findings/findings_writer';
import { createThreadConversationResolver } from './subjects/services/thread_conversation_resolver';
import { hypothesesAttachment, registerHypothesesAttachment } from './hypotheses/attachments';
import { HypothesesService } from './hypotheses/services/hypotheses_service';
import { createSetHypothesesTool } from './hypotheses/tools/set_hypotheses_tool';
import { EscalationsService } from './escalations/services/escalations_service';
import { registerEscalationConversationEvents } from './escalations/conversation_events';
import { registerInvestigationConversationEvents } from './investigations/conversation_events';
import { registerEscalationRoutes } from './escalations/routes/register_routes';
import { AssignmentsService } from './assignments/assignments_service';
import { InvestigationStatusService } from './investigations/services/investigation_status_service';
import { registerInvestigationRoutes } from './investigations/routes/register_routes';
import { createInvestigationsPrivilegesReader } from './investigations/services/check_investigations_privileges';
import { deleteInvestigationDataAcrossSpaces } from './investigations/services/delete_investigation_data_across_spaces';
import { countPendingProposals } from './investigations/services/count_pending_proposals';
import { InProgressResolver } from './investigations/services/in_progress';
import { InvestigationsQueryService } from './investigations/services/investigations_query_service';
import { createInvestigationsClient } from './investigations/services/investigations_client';
import { createConversationReadCheck } from './investigation_attachments';
import { createUserResolver } from './services/resolve_user';
import type { ResolveUser } from './services/resolve_user';
import type {
  AgenticInvestigationsPluginSetup,
  AgenticInvestigationsPluginStart,
  AgenticInvestigationsSetupDependencies,
  AgenticInvestigationsStartDependencies,
} from './types';

export class AgenticInvestigationsPlugin
  implements
    Plugin<
      AgenticInvestigationsPluginSetup,
      AgenticInvestigationsPluginStart,
      AgenticInvestigationsSetupDependencies,
      AgenticInvestigationsStartDependencies
    >
{
  private readonly logger: Logger;
  private escalationsEnabled: boolean;
  /** Escalations are on in config; their conversation events stay registered so old ones render. */
  private readonly escalationsConfigured: boolean;
  private casesBridgeEnabled: boolean;
  private caseBridgeService?: CaseBridgeService;
  private workerCaseService?: WorkerCaseService;
  private investigationsClientFactory?: (request: KibanaRequest) => InvestigationsClient;
  private findingsWriterFactory?: (request: KibanaRequest) => FindingsWriter;
  private impactService?: ImpactService;
  private impactPillsService?: ImpactPillsService;
  private subjectsService?: SubjectsService;
  private hypothesesService?: HypothesesService;
  private escalationsService?: EscalationsService;
  private assignmentsService?: AssignmentsService;
  private investigationStatusService?: InvestigationStatusService;
  private investigationsQueryService?: InvestigationsQueryService;
  private spaces?: AgenticInvestigationsStartDependencies['spaces'];
  private resolveUser?: ResolveUser;
  private agentBuilder?: AgenticInvestigationsStartDependencies['agentBuilder'];
  private workflowsManagement?: WorkflowsServerPluginSetup['management'];

  constructor(context: PluginInitializerContext<AgenticInvestigationsConfig>) {
    this.logger = context.logger.get();
    const config = context.config.get();
    this.casesBridgeEnabled = config.cases.enabled;
    this.escalationsConfigured = config.escalations.enabled;
    // Opening a case replaces escalations. Everything gated on escalationsEnabled (sub-feature,
    // routes, template UI) goes away exactly as it does when escalations are configured off.
    this.escalationsEnabled = config.escalations.enabled && !config.cases.enabled;
  }

  setup(
    coreSetup: CoreSetup<AgenticInvestigationsStartDependencies>,
    {
      features,
      workflowsExtensions,
      agentBuilder,
      workflowsManagement,
      cases,
      proposals,
    }: AgenticInvestigationsSetupDependencies
  ): AgenticInvestigationsPluginSetup {
    this.workflowsManagement = workflowsManagement?.management;
    // Without the Cases plugin, or with its agentic cases off, there is nothing to open: escalations
    // stay as configured.
    if (this.casesBridgeEnabled && (!cases || !cases.config.agentic.enabled)) {
      this.logger.warn(
        'xpack.agenticInvestigations.cases.enabled is on but Cases or xpack.cases.agentic.enabled is unavailable, so investigations keep escalations.'
      );
      this.casesBridgeEnabled = false;
      this.escalationsEnabled = this.escalationsConfigured;
    }
    registerFeatures({ features, escalationsEnabled: this.escalationsEnabled });

    registerInvestigationConversationEvents(agentBuilder);
    if (this.escalationsConfigured) {
      registerEscalationConversationEvents(agentBuilder);
    }

    // Attachment types, steps and tools register during setup but only run once Kibana has
    // started, so the authorization service is resolved per call rather than
    // captured here — `security.authz` does not exist yet.
    const investigationsPrivileges = createInvestigationsPrivilegesChecker({
      getSecurity: async () => (await coreSetup.getStartServices())[1].security,
      logger: this.logger,
    });

    const assertCanReadConversation = createConversationReadCheck({
      getConversationClient: (request) => this.getConversationClient(request),
    });

    registerImpactAttachment(agentBuilder, {
      getImpactService: () => this.requireImpactService(),
      privileges: investigationsPrivileges,
      assertCanReadConversation,
      logger: this.logger,
    });
    registerSubjectAttachment(agentBuilder, {
      getSubjectsService: () => this.requireSubjectsService(),
      privileges: investigationsPrivileges,
      assertCanReadConversation,
      logger: this.logger,
    });
    registerHypothesesAttachment(agentBuilder, {
      getHypothesesService: () => this.requireHypothesesService(),
      privileges: investigationsPrivileges,
      assertCanReadConversation,
      logger: this.logger,
    });

    agentBuilder.callbacks.registerConversationResolver(
      createThreadConversationResolver({
        getSubjectsService: () => this.requireSubjectsService(),
      })
    );

    // Phase 5: an investigation's findings are copied onto its own case (setting off: a no-op).
    const onFindingsWritten = this.casesBridgeEnabled
      ? (request: KibanaRequest, conversationId: string) =>
          this.copyFindingsToCase(request, conversationId)
      : undefined;

    agentBuilder.tools.register(
      createSetImpactTool({
        getImpactService: () => this.requireImpactService(),
        resolveUser: (request) => this.requireUserResolver()(request),
        privileges: investigationsPrivileges,
        logger: this.logger,
        onFindingsWritten,
      })
    );
    agentBuilder.tools.register(
      createSetHypothesesTool({
        getHypothesesService: () => this.requireHypothesesService(),
        resolveUser: (request) => this.requireUserResolver()(request),
        privileges: investigationsPrivileges,
        logger: this.logger,
        onFindingsWritten,
      })
    );

    registerImpactStepDefinitions({
      workflowsExtensions,
      getImpactService: () => this.requireImpactService(),
      resolveUser: (request) => this.requireUserResolver()(request),
      privileges: investigationsPrivileges,
      getAttachmentClient: (request) => this.getAttachmentClient(request),
      getConversationClient: (request) => this.getConversationClient(request),
      onFindingsWritten,
    });

    const router = coreSetup.http.createRouter();

    registerImpactRoutes({
      router,
      logger: this.logger,
      getImpactService: () => this.requireImpactService(),
      getImpactPillsService: () => this.requireImpactPillsService(),
      escalationsEnabled: this.escalationsEnabled,
      getSpaceId: (request) => this.getSpaceId(request),
      resolveUser: (request) => this.requireUserResolver()(request),
      getAttachmentClient: (request) => this.getAttachmentClient(request),
      getConversationClient: (request) => this.getConversationClient(request),
    });

    registerEscalationRoutes({
      router,
      logger: this.logger,
      getEscalationsService: () => this.requireEscalationsService(),
      getAssignmentsService: () => this.requireAssignmentsService(),
      getSpaceId: (request) => this.getSpaceId(request),
      getSecurity: async () => (await coreSetup.getStartServices())[1].security,
      escalationsEnabled: this.escalationsEnabled,
    });

    if (this.casesBridgeEnabled) {
      if (cases) {
        cases.attachmentFramework.registerAttachment(
          createInvestigationCaseAttachmentType(
            async () => (await coreSetup.getStartServices())[1].agentBuilder
          )
        );
        cases.registerSystemTemplate(ALERTZERO_CASE_OWNER, getAiInvestigationTemplate());
        for (const type of createNextUpCaseAttachmentTypes()) {
          cases.attachmentFramework.registerAttachment(type);
        }
        // Ties a new proposal to its investigation's case; inert while the setting is off.
        proposals?.registerCreateExtension({
          resolveCaseId: async ({ request, conversationId }) =>
            this.workerCaseService?.resolveCaseIdForProposal(request, async () =>
              (await this.getConversationClient(request)).get(conversationId)
            ),
          onCreated: async ({ request, proposal }) =>
            this.workerCaseService?.onProposalCreated(request, proposal),
        });
        registerCaseDecisionRoutes({
          router,
          logger: this.logger,
          getWorkerCaseService: () => this.requireWorkerCaseService(),
        });
        registerCaseBridgeConversationEvents(agentBuilder);
        registerCaseBridgeUiSettings(coreSetup.uiSettings);
        registerCaseBridgeRoutes({
          router,
          logger: this.logger,
          getCaseBridgeService: () => this.requireCaseBridgeService(),
        });
      }
    }

    registerInvestigationRoutes({
      router,
      logger: this.logger,
      onInvestigationClosed: this.casesBridgeEnabled
        ? async (request, investigationId) => {
            const [coreStart] = await coreSetup.getStartServices();
            const uiSettings = coreStart.uiSettings.asScopedToClient(
              coreStart.savedObjects.getScopedClient(request)
            );
            if (await uiSettings.get<boolean>(CLOSE_CASE_WHEN_INVESTIGATIONS_CLOSE_SETTING)) {
              await this.caseBridgeService?.closeCaseIfAllInvestigationsClosed(
                request,
                investigationId
              );
            }
          }
        : undefined,
      getAssignmentsService: () => this.requireAssignmentsService(),
      getInvestigationStatusService: () => this.requireInvestigationStatusService(),
      getInvestigationsQueryService: () => this.requireInvestigationsQueryService(),
      privileges: createInvestigationsPrivilegesReader({
        getSecurity: async () => (await coreSetup.getStartServices())[1].security,
        escalationsEnabled: this.escalationsEnabled,
      }),
    });

    registerInvestigationStepDefinitions({
      workflowsExtensions,
      getInvestigationStatusService: () => this.requireInvestigationStatusService(),
      getConversationClient: (request) => this.getConversationClient(request),
      getInvestigationsClient: (request) => this.requireInvestigationsClientFactory()(request),
      getFindingsWriter: (request) => this.requireFindingsWriterFactory()(request),
    });

    registerWorkflowExecutionStepDefinitions({
      workflowsExtensions,
      getConversationClient: (request) => this.getConversationClient(request),
    });

    return { isCasesBridgeEnabled: () => this.casesBridgeEnabled };
  }

  start(
    coreStart: CoreStart,
    plugins: AgenticInvestigationsStartDependencies
  ): AgenticInvestigationsPluginStart {
    this.spaces = plugins.spaces;
    this.agentBuilder = plugins.agentBuilder;
    this.resolveUser = createUserResolver({
      userProfile: coreStart.userProfile,
      security: coreStart.security,
      logger: this.logger,
    });

    // Reads and writes go through the internal user; authorization is enforced
    // at the API layer.
    this.impactService = new ImpactService({
      storage: createImpactStorageClient({
        esClient: coreStart.elasticsearch.client.asInternalUser,
        logger: this.logger,
      }),
    });

    const esClient = coreStart.elasticsearch.client.asInternalUser;
    this.subjectsService = new SubjectsService({
      documents: subjectAttachment.createService({ esClient, logger: this.logger }),
      claims: new SubjectClaimsService({
        storage: createSubjectClaimStorageClient({ esClient, logger: this.logger }),
      }),
    });
    this.hypothesesService = new HypothesesService({
      documents: hypothesesAttachment.createService({ esClient, logger: this.logger }),
    });

    this.investigationStatusService = new InvestigationStatusService({
      getConversationClient: (request) =>
        plugins.agentBuilder.conversations.getScopedClient({ request }),
      getProposals: () => plugins.proposals,
      getSpaceId: (request) => this.getSpaceId(request),
      logger: this.logger,
    });

    this.investigationsQueryService = new InvestigationsQueryService({
      getConversationClient: (request) => this.getConversationClient(request),
      getSpaceId: (request) => this.getSpaceId(request),
      getImpactService: () => this.requireImpactService(),
      getSubjectsService: () => this.requireSubjectsService(),
      getHypothesesService: () => this.requireHypothesesService(),
      getProposals: () => plugins.proposals,
      inProgress: new InProgressResolver({
        getWorkflowsManagement: () => this.workflowsManagement,
        getProposals: () => plugins.proposals,
        logger: this.logger,
      }),
      logger: this.logger,
    });

    const startPrivileges = createInvestigationsPrivilegesChecker({
      getSecurity: async () => plugins.security,
      logger: this.logger,
    });
    const getImpactClient = createImpactClient({
      getImpactService: () => this.requireImpactService(),
      getSpaceId: (request) => this.getSpaceId(request),
      privileges: startPrivileges,
      getConversationClient: (request) => this.getConversationClient(request),
    });

    if (this.escalationsEnabled) {
      this.escalationsService = new EscalationsService({
        logger: this.logger,
        getImpactClient,
        getConversationClient: (request) =>
          plugins.agentBuilder.conversations.getScopedClient({ request }),
        getAttachmentsClient: (request) =>
          plugins.agentBuilder.attachments.getScopedClient({ request }),
        conversationTemplates: plugins.agentBuilder.conversationTemplates,
        getInvestigationStatusService: () => this.requireInvestigationStatusService(),
        countPendingProposals: (request, conversationIds) =>
          countPendingProposals({
            proposals: plugins.proposals,
            request,
            conversationIds,
            spaceId: this.getSpaceId(request),
            logger: this.logger,
          }),
        getLinkActor: (request) =>
          resolveLinkActor({
            request,
            security: coreStart.security,
            esClient: coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
          }),
      });
    }

    this.impactPillsService = new ImpactPillsService({
      esClient,
      logger: this.logger,
      getImpactService: () => this.requireImpactService(),
      privileges: startPrivileges,
      getSpaceId: (request) => this.getSpaceId(request),
      getProposals: () => plugins.proposals,
      getEscalationsService: () => this.escalationsService,
      getEntityStoreNames: createEntityStoreNameLookup({
        getEntityStore: () => plugins.entityStore,
        getEsClient: (request) => coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
        getSpaceId: (request) => this.getSpaceId(request),
        logger: this.logger,
      }),
    });

    if (this.casesBridgeEnabled && plugins.cases) {
      this.caseBridgeService = new CaseBridgeService({
        logger: this.logger.get('casesBridge'),
        getCases: () => plugins.cases,
        getAgentBuilder: () => plugins.agentBuilder,
        getInvestigationStatusService: () => this.requireInvestigationStatusService(),
        getActor: (request) =>
          getEventActorForUser(coreStart.security.authc.getCurrentUser(request)),
        getCurrentUserProfileUid: async (request) =>
          (await coreStart.userProfile.getCurrent({ request }))?.uid ??
          coreStart.security.authc.getCurrentUser(request)?.profile_uid,
        canManageInvestigations: async (request) => {
          try {
            await startPrivileges.assertCanManage(request);
            return true;
          } catch {
            return false;
          }
        },
        onLinkedInvestigationsUpdated: (request, caseId) =>
          this.workerCaseService?.refreshPendingDecisions(request, caseId) ?? Promise.resolve(),
      });
      subscribeToCaseEvents({
        cases: plugins.cases,
        service: this.caseBridgeService,
        logger: this.logger.get('casesBridge'),
      });
      const proposalsStart = plugins.proposals;
      this.workerCaseService = new WorkerCaseService({
        logger: this.logger.get('workerCases'),
        getCases: () => plugins.cases,
        getBridge: () => this.requireCaseBridgeService(),
        getProposals: () => proposalsStart,
        getSpaceId: (request) => this.getSpaceId(request),
        getSettings: async (request) => {
          const uiSettings = coreStart.uiSettings.asScopedToClient(
            coreStart.savedObjects.getScopedClient(request)
          );
          const [enabled, visibility] = await Promise.all([
            uiSettings.get<boolean>(OPEN_CASES_FOR_INVESTIGATIONS_SETTING),
            uiSettings.get<CaseVisibility>(OPEN_CASES_FOR_INVESTIGATIONS_VISIBILITY_SETTING),
          ]);
          return {
            enabled: enabled === true,
            visibility: visibility === 'restricted' ? 'restricted' : 'public',
          };
        },
        readFindings: async (conversationId, spaceId) => {
          const [impact, hypotheses] = await Promise.all([
            this.requireImpactService().findByConversationId(conversationId, spaceId),
            this.requireHypothesesService().findByConversationId(conversationId, spaceId),
          ]);
          return { impact, hypotheses };
        },
        canDecideProposals: async (request) =>
          (await proposalsStart?.getProposalPrivileges().canManage(request)) ?? false,
      });
    }

    this.assignmentsService = new AssignmentsService({
      getConversationClient: (request) =>
        plugins.agentBuilder.conversations.getScopedClient({ request }),
    });

    const getSubjectsClient = createSubjectsClient({
      getSubjectsService: () => this.requireSubjectsService(),
      getSpaceId: (request) => this.getSpaceId(request),
      privileges: startPrivileges,
      resolveUser: (request) => this.requireUserResolver()(request),
      getConversationClient: (request) => this.getConversationClient(request),
      getAttachmentClient: (request) => this.getAttachmentClient(request),
    });

    const getFindingsWriter = createFindingsWriter({
      getHypothesesService: () => this.requireHypothesesService(),
      getImpactService: () => this.requireImpactService(),
      getSpaceId: (request) => this.getSpaceId(request),
      privileges: startPrivileges,
      resolveUser: (request) => this.requireUserResolver()(request),
      getConversationClient: (request) => this.getConversationClient(request),
      getAttachmentClient: (request) => this.getAttachmentClient(request),
      onFindingsWritten: this.casesBridgeEnabled
        ? (request, conversationId) => this.copyFindingsToCase(request, conversationId)
        : undefined,
    });

    const getInvestigationsClient = createInvestigationsClient({
      getQueryService: () => this.requireInvestigationsQueryService(),
      getSpaceId: (request) => this.getSpaceId(request),
      privileges: startPrivileges,
      getConversationClient: (request, source) =>
        plugins.agentBuilder.conversations.getScopedClient({ request, source }),
      getWorkerCases: () => this.workerCaseService,
      deleteAllInSpace: async (spaceId) => {
        const { subjects, claims } = await this.requireSubjectsService().deleteAllInSpace(spaceId);
        const impact = await this.requireImpactService()
          .getDocumentService()
          .deleteAllInSpace(spaceId);
        const hypotheses = await this.requireHypothesesService()
          .getDocumentService()
          .deleteAllInSpace(spaceId);
        return { subjects, subjectClaims: claims, impact, hypotheses };
      },
    });

    this.investigationsClientFactory = getInvestigationsClient;
    this.findingsWriterFactory = getFindingsWriter;

    return {
      isCasesBridgeEnabled: () => this.casesBridgeEnabled,
      getImpactClient,
      getSubjectsClient,
      getInvestigationsClient,
      deleteSubjectInvestigationDataAcrossSpaces: () => {
        const subjects = this.requireSubjectsService();
        return deleteInvestigationDataAcrossSpaces({
          subjects: subjects.getDocumentService(),
          impact: this.requireImpactService().getDocumentService(),
          hypotheses: this.requireHypothesesService().getDocumentService(),
          deleteClaims: (ids, spaceId) => subjects.deleteClaimsByConversationIds(ids, spaceId),
          deleteAllClaims: () => subjects.deleteAllClaimsAcrossSpaces(),
        });
      },
      getEscalationsService: () => this.requireEscalationsService(),
      getFindingsWriter,
    };
  }

  private requireWorkerCaseService(): WorkerCaseService {
    if (!this.workerCaseService) {
      throw new Error(
        'Worker cases are not available until the agenticInvestigations plugin has started with Cases'
      );
    }
    return this.workerCaseService;
  }

  private requireInvestigationsClientFactory(): (request: KibanaRequest) => InvestigationsClient {
    if (!this.investigationsClientFactory) {
      throw new Error(
        'The investigations client is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.investigationsClientFactory;
  }

  private requireFindingsWriterFactory(): (request: KibanaRequest) => FindingsWriter {
    if (!this.findingsWriterFactory) {
      throw new Error(
        'The findings writer is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.findingsWriterFactory;
  }

  /** Best effort: a findings write never fails because its case copy did. */
  private async copyFindingsToCase(request: KibanaRequest, conversationId: string): Promise<void> {
    const workerCases = this.workerCaseService;
    if (!workerCases) return;
    try {
      const investigation = await (await this.getConversationClient(request)).get(conversationId);
      await workerCases.onFindingsWritten(request, investigation);
    } catch (error) {
      this.logger.warn(
        `Findings of ${conversationId} not copied to its case: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private requireCaseBridgeService(): CaseBridgeService {
    if (!this.caseBridgeService) {
      throw new Error(
        'The cases bridge is not available until the agenticInvestigations plugin has started with Cases'
      );
    }
    return this.caseBridgeService;
  }

  private requireImpactPillsService(): ImpactPillsService {
    if (!this.impactPillsService) {
      throw new Error(
        'Impact pills service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.impactPillsService;
  }

  private requireImpactService(): ImpactService {
    if (!this.impactService) {
      throw new Error(
        'Impact service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.impactService;
  }

  private requireSubjectsService(): SubjectsService {
    if (!this.subjectsService) {
      throw new Error(
        'Subjects service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.subjectsService;
  }

  private requireHypothesesService(): HypothesesService {
    if (!this.hypothesesService) {
      throw new Error(
        'Hypotheses service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.hypothesesService;
  }

  private requireInvestigationsQueryService(): InvestigationsQueryService {
    if (!this.investigationsQueryService) {
      throw new Error(
        'Investigations query service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.investigationsQueryService;
  }

  private requireEscalationsService(): EscalationsService {
    if (!this.escalationsEnabled) {
      throw new Error(
        'Escalations are disabled by xpack.agenticInvestigations.escalations.enabled: false'
      );
    }
    if (!this.escalationsService) {
      throw new Error(
        'Escalations service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.escalationsService;
  }

  private requireAssignmentsService(): AssignmentsService {
    if (!this.assignmentsService) {
      throw new Error(
        'Assignments service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.assignmentsService;
  }

  private requireInvestigationStatusService(): InvestigationStatusService {
    if (!this.investigationStatusService) {
      throw new Error(
        'InvestigationStatusService is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.investigationStatusService;
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  /**
   * Agent Builder stays required because escalations and assignments are
   * conversations. Callers resolve these clients before the impact index write,
   * so a missing client fails the attach.
   */
  private requireAgentBuilder(): NonNullable<AgenticInvestigationsPlugin['agentBuilder']> {
    if (!this.agentBuilder) {
      throw new Error(
        'Agent Builder is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.agentBuilder;
  }

  private async getAttachmentClient(request: KibanaRequest): Promise<AttachmentPublicClient> {
    return this.requireAgentBuilder().attachments.getScopedClient({ request });
  }

  private async getConversationClient(request: KibanaRequest): Promise<ConversationPublicClient> {
    return this.requireAgentBuilder().conversations.getScopedClient({ request });
  }

  /**
   * Server-derived so a caller can never attribute a write to someone else.
   * Built in `start()`, and only ever called from a request handler.
   */
  private requireUserResolver(): ResolveUser {
    if (!this.resolveUser) {
      throw new Error(
        'User resolution is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.resolveUser;
  }

  stop() {}
}
