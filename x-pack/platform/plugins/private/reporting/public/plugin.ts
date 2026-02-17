/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, map, type Observable, ReplaySubject } from 'rxjs';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import { i18n } from '@kbn/i18n';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type {
  SharePluginSetup,
  SharePluginStart,
  ExportShare,
  ExportShareDerivatives,
} from '@kbn/share-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';

import { durationToNumber } from '@kbn/reporting-common';
import type { ClientConfigType } from '@kbn/reporting-public';
import { ReportingAPIClient } from '@kbn/reporting-public';
import {
  getSharedComponents,
  reportingCsvExportShareIntegration,
  reportingPDFExportShareIntegration,
  reportingPNGExportShareIntegration,
} from '@kbn/reporting-public/share';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { ReportingSetup, ReportingStart } from '.';
import { ReportingNotifierStreamHandler as StreamHandler } from './lib/stream_handler';
import type { StartServices } from './types';
import { APP_DESC, APP_TITLE } from './translations';
import { APP_PATH } from './constants';

export interface ReportingPublicPluginSetupDependencies {
  home: HomePublicPluginSetup;
  management: ManagementSetup;
  uiActions: UiActionsSetup;
  screenshotMode: ScreenshotModePluginSetup;
  share: SharePluginSetup;
  intl: InjectedIntl;
  actions: ActionsPublicPluginSetup;
}

export interface ReportingPublicPluginStartDependencies {
  home: HomePublicPluginStart;
  data: DataPublicPluginStart;
  management: ManagementStart;
  licensing: LicensingPluginStart;
  uiActions: UiActionsStart;
  share: SharePluginStart;
  actions: ActionsPublicPluginSetup;
}

type StartServices$ = Observable<StartServices>;

/**
 * @internal
 * @implements Plugin
 */
export class ReportingPublicPlugin
  implements
    Plugin<
      ReportingSetup,
      ReportingStart,
      ReportingPublicPluginSetupDependencies,
      ReportingPublicPluginStartDependencies
    >
{
  private kibanaVersion: string;
  private apiClient?: ReportingAPIClient;
  private readonly stop$ = new ReplaySubject<void>(1);
  private readonly title = i18n.translate('xpack.reporting.management.reportingTitle', {
    defaultMessage: 'Reporting',
  });
  private readonly breadcrumbText = i18n.translate('xpack.reporting.breadcrumb', {
    defaultMessage: 'Reporting',
  });
  private config: ClientConfigType;
  private contract?: ReportingSetup;
  private startServices$?: StartServices$;
  private isServerless: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  private getContract(apiClient: ReportingAPIClient, startServices$: StartServices$) {
    this.contract = {
      components: getSharedComponents(apiClient, startServices$),
    };

    if (!this.contract) {
      throw new Error(`Setup error in Reporting plugin!`);
    }

    return this.contract;
  }

  public setup(
    core: CoreSetup<ReportingPublicPluginStartDependencies>,
    setupDeps: ReportingPublicPluginSetupDependencies
  ) {
    const { getStartServices } = core;
    const {
      home: homeSetup,
      management: managementSetup,
      screenshotMode: screenshotModeSetup,
      share: shareSetup,
      uiActions: uiActionsSetup,
      actions: actionsSetup,
    } = setupDeps;

    const startServices$: Observable<StartServices> = from(getStartServices()).pipe(
      map(([start, ...rest]) => {
        return [
          {
            application: start.application,
            notifications: start.notifications,
            rendering: start.rendering,
            uiSettings: start.uiSettings,
            chrome: start.chrome,
            userProfile: start.userProfile,
          },
          ...rest,
        ];
      })
    );

    const apiClient = new ReportingAPIClient(core.http, core.uiSettings, this.kibanaVersion);
    this.apiClient = apiClient;

    homeSetup.featureCatalogue.register({
      id: 'reporting',
      title: APP_TITLE,
      description: APP_DESC,
      icon: 'reportingApp',
      path: APP_PATH,
      showOnHomePage: false,
      category: 'admin',
    });

    managementSetup.sections.section.insightsAndAlerting.registerApp({
      id: 'reporting',
      title: this.title,
      order: 3,
      keywords: ['reports', 'report', 'reporting'],
      mount: async (params) => {
        params.setBreadcrumbs([{ text: this.breadcrumbText }]);
        const [[coreStart, startDeps], { mountManagementSection }] = await Promise.all([
          getStartServices(),
          import('./management/mount_management_section'),
        ]);

        const { licensing, data, share } = startDeps;
        const { docTitle } = coreStart.chrome;
        docTitle.change(this.title);

        const umountAppCallback = await mountManagementSection({
          coreStart,
          license$: licensing.license$,
          dataService: data,
          shareService: share,
          config: this.config,
          apiClient,
          params,
          actionsService: actionsSetup,
          notificationsService: coreStart.notifications,
        });

        return () => {
          docTitle.reset();
          umountAppCallback();
        };
      },
    });

    core.application.register({
      id: 'reportingRedirect',
      mount: async (params) => {
        const [startServices, importParams] = await Promise.all([
          core.getStartServices(),
          import('./redirect'),
        ]);
        const [coreStart] = startServices;
        const { mountRedirectApp } = importParams;

        return mountRedirectApp(coreStart, {
          ...params,
          apiClient,
          screenshotMode: screenshotModeSetup,
          share: shareSetup,
        });
      },
      title: 'Reporting redirect app',
      chromeless: true,
      exactRoute: true,
      visibleIn: [],
    });

    uiActionsSetup.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, 'generateCsvReport', async () => {
      const { ReportingCsvPanelAction } = await import('@kbn/reporting-csv-share-panel');
      return new ReportingCsvPanelAction({
        core,
        apiClient,
        startServices$,
        csvConfig: this.config.csv,
      });
    });

    shareSetup.registerShareIntegration<ExportShare>(
      'search',
      // TODO: export the reporting pdf export provider for registration in the actual plugins that depend on it
      reportingCsvExportShareIntegration({
        apiClient,
        startServices$,
        isServerless: this.isServerless,
        csvConfig: this.config.csv,
      })
    );

    if (this.config.export_types.pdf.enabled || this.config.export_types.png.enabled) {
      shareSetup.registerShareIntegration<ExportShare>(
        // TODO: export the reporting pdf export provider for registration in the actual plugins that depend on it
        reportingPDFExportShareIntegration({ apiClient, startServices$ })
      );

      shareSetup.registerShareIntegration<ExportShare>(
        // TODO: export the reporting pdf export provider for registration in the actual plugins that depend on it
        reportingPNGExportShareIntegration({ apiClient, startServices$ })
      );
    }

    import('./management/integrations/scheduled_report_share_integration').then(
      async ({
        shouldRegisterScheduledReportShareIntegration,
        createScheduledReportShareIntegration,
      }) => {
        const [coreStart, startDeps] = await getStartServices();
        if (await shouldRegisterScheduledReportShareIntegration(core.http)) {
          shareSetup.registerShareIntegration<ExportShareDerivatives>(
            createScheduledReportShareIntegration({
              apiClient,
              services: { ...coreStart, ...startDeps, actions: actionsSetup },
            })
          );
        }
      }
    );

    this.startServices$ = startServices$;
    return this.getContract(apiClient, startServices$);
  }

  public start(core: CoreStart) {
    const streamHandler = new StreamHandler(this.apiClient!, core);
    const interval = durationToNumber(this.config.poll.jobsRefresh.interval);
    streamHandler.startPolling(interval, this.stop$);

    return this.getContract(this.apiClient!, this.startServices$!);
  }

  public stop() {
    this.stop$.next();
  }
}

export type Setup = ReturnType<ReportingPublicPlugin['setup']>;
export type Start = ReturnType<ReportingPublicPlugin['start']>;
