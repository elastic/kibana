/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { AppStatus, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createBrowserHistory } from 'history';

import { KibanaServices } from './common/lib/kibana';
import type { CasesUiConfigType } from '../common/ui/types';
import { APP_ID, APP_PATH, CASES_APP_ID, CASES_APP_PATH, FEATURE_ID_V4 } from '../common/constants';
import { getCasesDeepLinks } from './common/navigation/deep_links';
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
  private unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
  }

  public setup(core: CoreSetup, plugins: CasesPublicSetupDependencies): CasesPublicSetup {
    const kibanaVersion = this.kibanaVersion;
    const storage = this.storage;
    const unifiedAttachmentTypeRegistry = this.unifiedAttachmentTypeRegistry;

    const config = this.initializerContext.config.get<CasesUiConfigType>();
    const topLevelAppEnabled = config.topLevelApp?.enabled === true;
    registerCaseFileKinds(config.files, plugins.files);
    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: APP_ID,
        title: APP_TITLE,
        description: APP_DESC,
        icon: 'casesApp',
        path: topLevelAppEnabled ? CASES_APP_PATH : APP_PATH,
        showOnHomePage: false,
        category: 'admin',
      });
    }

    if (topLevelAppEnabled) {
      const appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
      void core.getStartServices().then(([coreStart]) => {
        // casesV4 does not list the app (see its feature definition), so access follows its UI
        // capabilities, which legacy roles inherit through `replacedBy`.
        const canRead = getUICapabilities(coreStart.application.capabilities[FEATURE_ID_V4]).read;
        appUpdater$.next(() => (canRead ? {} : { status: AppStatus.inaccessible, visibleIn: [] }));
      });

      core.application.register({
        id: CASES_APP_ID,
        title: APP_TITLE,
        category: DEFAULT_APP_CATEGORIES.kibana,
        euiIconType: 'casesApp',
        appRoute: CASES_APP_PATH,
        order: 1150,
        updater$: appUpdater$,
        visibleIn: ['globalSearch', 'classicSideNav', 'projectSideNav', 'home', 'kibanaOverview'],
        deepLinks: getCasesDeepLinks({
          basePath: '/',
          templatesEnabled: config.templates?.enabled === true,
        }).deepLinks,
        async mount(params: AppMountParameters) {
          const [coreStart, pluginsStart] = (await core.getStartServices()) as [
            CoreStart,
            CasesPublicStartDependencies,
            unknown
          ];

          const { renderApp } = await import('./application');

          return renderApp({
            mountParams: params,
            coreStart,
            pluginsStart,
            storage,
            kibanaVersion,
            unifiedAttachmentTypeRegistry,
          });
        },
      });
    }

    if (config.stack.enabled) {
      plugins.management.sections.section.insightsAndAlerting.registerApp({
        id: APP_ID,
        title: APP_TITLE,
        order: 1,
        mainPaddingSize: 'none',
        // With the top-level app on, this mount only redirects old Stack Management links.
        ...(topLevelAppEnabled ? { hideFromSidebar: true, visibleIn: [] } : {}),
        async mount(params: ManagementAppMountParams) {
          const [coreStart, pluginsStart] = (await core.getStartServices()) as [
            CoreStart,
            CasesPublicStartDependencies,
            unknown
          ];

          if (topLevelAppEnabled) {
            const { pathname, search, hash } = params.history.location;
            void coreStart.application.navigateToApp(CASES_APP_ID, {
              path: `${pathname}${search}${hash}`,
              replace: true,
            });
            return () => {};
          }

          const { renderApp } = await import('./application');

          return renderApp({
            mountParams: params,
            coreStart,
            pluginsStart,
            storage,
            kibanaVersion,
            unifiedAttachmentTypeRegistry,
          });
        },
      });
    }

    registerSystemActions(plugins.triggersActionsUi);

    registerAnalytics({ analyticsService: core.analytics });

    registerCasesSteps(
      plugins.workflowsExtensions,
      this.unifiedAttachmentTypeRegistry,
      config.attachments?.enabled === true,
      config.templates?.enabled === true
    );
    registerCasesWorkflowTriggers(plugins.workflowsExtensions);

    return {
      attachmentFramework: {
        registerAttachment: (attachmentType) => {
          this.unifiedAttachmentTypeRegistry.register(attachmentType);
        },
      },
      config: { topLevelAppEnabled },
    };
  }

  public start(core: CoreStart, plugins: CasesPublicStartDependencies): CasesPublicStart {
    const config = this.initializerContext.config.get<CasesUiConfigType>();

    registerInternalAttachments(this.unifiedAttachmentTypeRegistry, {
      hasDashboardPluginEnabled: Boolean(plugins.dashboard),
      hasMapsPluginEnabled: Boolean(plugins.maps),
    });

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
      unifiedAttachmentTypeRegistry: this.unifiedAttachmentTypeRegistry,
      getFilesClient: plugins.files.filesClientFactory.asScoped,
    });

    registerActions(
      {
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

    if (plugins.agentBuilder) {
      void import('./agent_builder').then(({ registerCasesAgentBuilderAttachments }) => {
        if (plugins.agentBuilder) {
          registerCasesAgentBuilderAttachments({
            attachments: plugins.agentBuilder.attachments,
            application: core.application,
          });
        }
      });
    }

    return {
      config: {
        templatesEnabled: config?.templates?.enabled ?? false,
        attachmentsEnabled: config?.attachments?.enabled ?? false,
        chatEnabled: config?.chat?.enabled ?? false,
        runWorkflowsEnabled: config?.runWorkflows?.enabled ?? false,
        topLevelAppEnabled: config?.topLevelApp?.enabled ?? false,
        customStatusesEnabled: config?.customStatuses?.enabled ?? false,
      },
      api: createClientAPI({ http: core.http }),
      ui: {
        getCases: (props) =>
          getCasesLazy({
            ...props,
            unifiedAttachmentTypeRegistry: this.unifiedAttachmentTypeRegistry,
            getFilesClient: plugins.files.filesClientFactory.asScoped,
          }),
        getCasesContext,
        getRecentCases: (props) =>
          getRecentCasesLazy({
            ...props,
            unifiedAttachmentTypeRegistry: this.unifiedAttachmentTypeRegistry,
            getFilesClient: plugins.files.filesClientFactory.asScoped,
          }),
        // @deprecated Please use the hook useCasesAddToExistingCaseModal
        getAllCasesSelectorModal: (props) =>
          getAllCasesSelectorModalLazy({
            ...props,
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
        canUseCases: canUseCases(
          core.application.capabilities,
          config.topLevelApp?.enabled === true
        ),
        getUICapabilities,
        getRuleIdFromEvent,
        groupAlertsByRule,
      },
    };
  }

  public stop() {}
}
