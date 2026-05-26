/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createBrowserHistory } from 'history';

import { KibanaServices } from './common/lib/kibana';
import type { CasesUiConfigType } from '../common/ui/types';
import { APP_ID, APP_PATH } from '../common/constants';
import { APP_TITLE, APP_DESC } from './common/translations';
import { registerCasesSteps, registerCasesWorkflowTriggers } from './workflows';
import { useCasesAddToExistingCaseModal } from './components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { useCasesAddToNewCaseFlyout } from './components/create/flyout/use_cases_add_to_new_case_flyout';
import { useIsAddToCaseOpen } from './components/cases_context/state/use_is_add_to_case_open';
import { createClientAPI } from './client/api';
import { canUseCases } from './client/helpers/can_use_cases';
import { getRuleIdFromEvent } from './client/helpers/get_rule_id_from_event';
import { getAllCasesSelectorModalLazy } from './client/ui/get_all_cases_selector_modal';
import { getCasesLazy } from './client/ui/get_cases';
import { getCasesContextLazy } from './client/ui/get_cases_context';
import { getRecentCasesLazy } from './client/ui/get_recent_cases';
import { groupAlertsByRule } from './client/helpers/group_alerts_by_rule';
import { getUICapabilities } from './client/helpers/capabilities';
import { ExternalReferenceAttachmentTypeRegistry } from './client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from './client/attachment_framework/persistable_state_registry';
import { UnifiedAttachmentTypeRegistry } from './client/attachment_framework/unified_attachment_registry';
import { registerCaseFileKinds } from './files';
import { registerInternalAttachments } from './components/attachments';
import { registerActions } from './components/attachments/lens/actions';
import type {
  CasesPublicSetup,
  CasesPublicStart,
  CasesPublicSetupDependencies,
  CasesPublicStartDependencies,
} from './types';
import { registerSystemActions } from './components/system_actions';
import { registerAnalytics } from './analytics';
import { getObservablesFromEcs } from './client/helpers/get_observables_from_ecs';

/**
 * @public
 * A plugin for retrieving Cases UI components
 */
export class CasesUiPlugin
  implements
    Plugin<
      CasesPublicSetup,
      CasesPublicStart,
      CasesPublicSetupDependencies,
      CasesPublicStartDependencies
    >
{
  private readonly kibanaVersion: string;
  private readonly storage = new Storage(localStorage);
  private externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  private persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  private unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
  private agentBuilderPromise?: Promise<AgentBuilderPluginStart | undefined>;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
    this.persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
    this.unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
  }

  public setup(
    core: CoreSetup<CasesPublicStartDependencies, CasesPublicStart>,
    plugins: CasesPublicSetupDependencies
  ): CasesPublicSetup {
    this.setupAgentBuilderStart(core);

    const kibanaVersion = this.kibanaVersion;
    const storage = this.storage;
    const externalReferenceAttachmentTypeRegistry = this.externalReferenceAttachmentTypeRegistry;
    const persistableStateAttachmentTypeRegistry = this.persistableStateAttachmentTypeRegistry;
    const unifiedAttachmentTypeRegistry = this.unifiedAttachmentTypeRegistry;
    const agentBuilderPromise = this.agentBuilderPromise;

    registerInternalAttachments(unifiedAttachmentTypeRegistry);

    const config = this.initializerContext.config.get<CasesUiConfigType>();
    registerCaseFileKinds(config.files, plugins.files);
    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: APP_ID,
        title: APP_TITLE,
        description: APP_DESC,
        icon: 'casesApp',
        path: APP_PATH,
        showOnHomePage: false,
        category: 'admin',
      });
    }

    if (config.stack.enabled) {
      plugins.management.sections.section.insightsAndAlerting.registerApp({
        id: APP_ID,
        title: APP_TITLE,
        order: 1,
        async mount(params: ManagementAppMountParams) {
          const [coreStart, pluginsStart] = (await core.getStartServices()) as [
            CoreStart,
            CasesPublicStartDependencies,
            unknown
          ];
          const agentBuilder = await agentBuilderPromise;
          const pluginsStartWithAgentBuilder: CasesPublicStartDependencies = {
            ...pluginsStart,
            agentBuilder: pluginsStart.agentBuilder ?? agentBuilder,
          };

          const { renderApp } = await import('./application');

          return renderApp({
            mountParams: params,
            coreStart,
            pluginsStart: pluginsStartWithAgentBuilder,
            storage,
            kibanaVersion,
            externalReferenceAttachmentTypeRegistry,
            persistableStateAttachmentTypeRegistry,
            unifiedAttachmentTypeRegistry,
          });
        },
      });
    }

    registerSystemActions(plugins.triggersActionsUi);

    registerAnalytics({ analyticsService: core.analytics });

    registerCasesSteps(plugins.workflowsExtensions);
    registerCasesWorkflowTriggers(plugins.workflowsExtensions);

    return {
      attachmentFramework: {
        registerExternalReference: (externalReferenceAttachmentType) => {
          this.externalReferenceAttachmentTypeRegistry.register(externalReferenceAttachmentType);
        },
        registerPersistableState: (persistableStateAttachmentType) => {
          this.persistableStateAttachmentTypeRegistry.register(persistableStateAttachmentType);
        },
        registerUnified: (unifiedAttachmentType) => {
          this.unifiedAttachmentTypeRegistry.register(unifiedAttachmentType);
        },
      },
    };
  }

  public start(core: CoreStart, plugins: CasesPublicStartDependencies): CasesPublicStart {
    const config = this.initializerContext.config.get<CasesUiConfigType>();

    KibanaServices.init({
      ...core,
      ...plugins,
      kibanaVersion: this.kibanaVersion,
      config,
    });

    /**
     * getCasesContextLazy returns a new component each time is being called. To avoid re-renders
     * we get the component on start and provide the same component to all consumers.
     */
    const getCasesContext = getCasesContextLazy({
      externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
      unifiedAttachmentTypeRegistry: this.unifiedAttachmentTypeRegistry,
      getFilesClient: plugins.files.filesClientFactory.asScoped,
    });

    registerActions(
      {
        externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
        persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
        unifiedAttachmentTypeRegistry: this.unifiedAttachmentTypeRegistry,
        getFilesClient: plugins.files.filesClientFactory.asScoped,
      },
      {
        core,
        plugins,
        history: createBrowserHistory(),
        storage: this.storage,
      }
    );

    return {
      config: {
        templatesEnabled: config?.templates?.enabled ?? false,
        casesRedesign: {
          list: config?.casesRedesign?.list ?? false,
          details: config?.casesRedesign?.details ?? false,
          settings: config?.casesRedesign?.settings ?? false,
        },
      },
      api: createClientAPI({ http: core.http }),
      ui: {
        getCases: (props) =>
          getCasesLazy({
            ...props,
            externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
            persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
            unifiedAttachmentTypeRegistry: this.unifiedAttachmentTypeRegistry,
            getFilesClient: plugins.files.filesClientFactory.asScoped,
          }),
        getCasesContext,
        getRecentCases: (props) =>
          getRecentCasesLazy({
            ...props,
            externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
            persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
            unifiedAttachmentTypeRegistry: this.unifiedAttachmentTypeRegistry,
            getFilesClient: plugins.files.filesClientFactory.asScoped,
          }),
        // @deprecated Please use the hook useCasesAddToExistingCaseModal
        getAllCasesSelectorModal: (props) =>
          getAllCasesSelectorModalLazy({
            ...props,
            externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
            persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
            unifiedAttachmentTypeRegistry: this.unifiedAttachmentTypeRegistry,
            getFilesClient: plugins.files.filesClientFactory.asScoped,
          }),
      },
      hooks: {
        useCasesAddToNewCaseFlyout,
        useCasesAddToExistingCaseModal,
        useIsAddToCaseOpen,
      },
      helpers: {
        canUseCases: canUseCases(core.application.capabilities),
        getUICapabilities,
        getRuleIdFromEvent,
        groupAlertsByRule,
        getObservablesFromEcs,
      },
    };
  }

  public stop() {}

  /**
   * Resolves Agent Builder at runtime without an optional plugin dependency, which would
   * create a circular dependency with agentBuilder's optional cases dependency.
   */
  private setupAgentBuilderStart(
    core: CoreSetup<CasesPublicStartDependencies, CasesPublicStart>
  ): void {
    try {
      this.agentBuilderPromise = core.plugins
        .onStart<{ agentBuilder: AgentBuilderPluginStart }>('agentBuilder')
        .then(({ agentBuilder }) => (agentBuilder.found ? agentBuilder.contract : undefined))
        .catch(() => undefined);
    } catch {
      this.agentBuilderPromise = Promise.resolve(undefined);
    }
  }
}
