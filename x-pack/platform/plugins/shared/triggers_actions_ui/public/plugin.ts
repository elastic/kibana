/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin as CorePlugin, CoreSetup, CoreStart } from '@kbn/core/public';

import { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import { RuleAction } from '@kbn/alerting-plugin/common';
import { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/public';
import { TypeRegistry } from '@kbn/alerts-ui-shared/src/common/type_registry';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { PluginInitializerContext } from '@kbn/core/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { FeaturesPluginStart } from '@kbn/features-plugin/public';
import { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { ManagementAppMountParams, ManagementSetup } from '@kbn/management-plugin/public';
import { triggersActionsRoute } from '@kbn/rule-data-utils';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { ReactElement } from 'react';
import { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { AlertsSearchBarProps } from './application/sections/alerts_search_bar';
import type { RuleUiAction } from './types';

import {
  ExperimentalFeatures,
  parseExperimentalConfigValue,
} from '../common/experimental_features';
import { ExperimentalFeaturesService } from './common/experimental_features_service';
import { getActionFormLazy } from './common/get_action_form';
import { getAddConnectorFlyoutLazy } from './common/get_add_connector_flyout';
import { getEditConnectorFlyoutLazy } from './common/get_edit_connector_flyout';
import { getRuleEventLogListLazy } from './common/get_rule_event_log_list';
import { getRuleStatusDropdownLazy } from './common/get_rule_status_dropdown';
import { getRuleStatusFilterLazy } from './common/get_rule_status_filter';
import { getRuleStatusPanelLazy } from './common/get_rule_status_panel';
import { getRuleTagBadgeLazy } from './common/get_rule_tag_badge';
import { getRuleTagFilterLazy } from './common/get_rule_tag_filter';
import { getRulesListLazy } from './common/get_rules_list';
import { getRulesListNotifyBadgeLazy } from './common/get_rules_list_notify_badge';

import { TriggersActionsUiConfigType } from '../common/types';
import { ActionAccordionFormProps } from './application/sections/action_connector_form/action_form';
import { AlertSummaryWidgetProps } from './application/sections/alert_summary_widget';
import { AlertSummaryWidgetDependencies } from './application/sections/alert_summary_widget/types';
import { RuleStatusPanelProps } from './application/sections/rule_details/components/rule_status_panel';
import { RuleSnoozeModalProps } from './application/sections/rules_list/components/rule_snooze_modal';
import { ALERTS_PAGE_ID, CONNECTORS_PLUGIN_ID, PLUGIN_ID } from './common/constants';
import { getAlertsSearchBarLazy } from './common/get_alerts_search_bar';
import { getGlobalRuleEventLogListLazy } from './common/get_global_rule_event_log_list';
import { getAlertSummaryWidgetLazy } from './common/get_rule_alerts_summary';
import { getRuleDefinitionLazy } from './common/get_rule_definition';
import { getRuleSnoozeModalLazy } from './common/get_rule_snooze_modal';
import { getRulesSettingsLinkLazy } from './common/get_rules_settings_link';

import type {
  ActionTypeModel,
  ConnectorServices,
  CreateConnectorFlyoutProps,
  EditConnectorFlyoutProps,
  GlobalRuleEventLogListProps,
  RuleDefinitionProps,
  RuleEventLogListOptions,
  RuleEventLogListProps,
  RuleStatusDropdownProps,
  RuleStatusFilterProps,
  RuleTagBadgeOptions,
  RuleTagBadgeProps,
  RuleTagFilterProps,
  RuleTypeModel,
  RulesListNotifyBadgePropsWithApi,
  RulesListProps,
} from './types';

export interface TriggersAndActionsUIPublicPluginSetup {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
}

export interface TriggersAndActionsUIPublicPluginStart {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
  getActionForm: (
    props: Omit<ActionAccordionFormProps, 'actionTypeRegistry' | 'setActions'> & {
      setActions: (actions: RuleAction[]) => void;
    }
  ) => ReactElement<ActionAccordionFormProps>;
  getAddConnectorFlyout: (
    props: Omit<CreateConnectorFlyoutProps, 'actionTypeRegistry'>
  ) => ReactElement<CreateConnectorFlyoutProps>;
  getEditConnectorFlyout: (
    props: Omit<EditConnectorFlyoutProps, 'actionTypeRegistry'>
  ) => ReactElement<EditConnectorFlyoutProps>;
  getAlertsSearchBar: (props: AlertsSearchBarProps) => ReactElement<AlertsSearchBarProps>;
  getRuleStatusDropdown: (props: RuleStatusDropdownProps) => ReactElement<RuleStatusDropdownProps>;
  getRuleTagFilter: (props: RuleTagFilterProps) => ReactElement<RuleTagFilterProps>;
  getRuleStatusFilter: (props: RuleStatusFilterProps) => ReactElement<RuleStatusFilterProps>;
  getRuleTagBadge: <T extends RuleTagBadgeOptions>(
    props: RuleTagBadgeProps<T>
  ) => ReactElement<RuleTagBadgeProps<T>>;
  getRuleEventLogList: <T extends RuleEventLogListOptions>(
    props: RuleEventLogListProps<T>
  ) => ReactElement<RuleEventLogListProps<T>>;
  getRulesList: (props: RulesListProps) => ReactElement;
  getRulesListNotifyBadge: (
    props: RulesListNotifyBadgePropsWithApi
  ) => ReactElement<RulesListNotifyBadgePropsWithApi>;
  getRuleDefinition: (props: RuleDefinitionProps) => ReactElement<RuleDefinitionProps>;
  getRuleStatusPanel: (props: RuleStatusPanelProps) => ReactElement<RuleStatusPanelProps>;
  getAlertSummaryWidget: (props: AlertSummaryWidgetProps) => ReactElement<AlertSummaryWidgetProps>;
  getRuleSnoozeModal: (props: RuleSnoozeModalProps) => ReactElement<RuleSnoozeModalProps>;
  getRulesSettingsLink: () => ReactElement;
  getGlobalRuleEventLogList: (
    props: GlobalRuleEventLogListProps
  ) => ReactElement<GlobalRuleEventLogListProps>;
}

interface PluginsSetup {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
  cloud?: CloudSetup;
  actions: ActionsPublicPluginSetup;
}

interface PluginsStart {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  dashboard: DashboardStart;
  charts: ChartsPluginStart;
  alerting?: AlertingStart;
  spaces?: SpacesPluginStart;
  navigateToApp: CoreStart['application']['navigateToApp'];
  features: FeaturesPluginStart;
  expressions: ExpressionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  licensing: LicensingPluginStart;
  serverless?: ServerlessPluginStart;
  fieldFormats: FieldFormatsRegistry;
  lens: LensPublicStart;
  fieldsMetadata: FieldsMetadataPublicStart;
}

export class Plugin
  implements
    CorePlugin<
      TriggersAndActionsUIPublicPluginSetup,
      TriggersAndActionsUIPublicPluginStart,
      PluginsSetup,
      PluginsStart
    >
{
  private actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  private ruleTypeRegistry: TypeRegistry<RuleTypeModel>;
  private config: TriggersActionsUiConfigType;
  private connectorServices?: ConnectorServices;
  readonly experimentalFeatures: ExperimentalFeatures;

  constructor(ctx: PluginInitializerContext) {
    this.actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    this.ruleTypeRegistry = new TypeRegistry<RuleTypeModel>();
    this.config = ctx.config.get();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
  }

  public setup(core: CoreSetup, plugins: PluginsSetup): TriggersAndActionsUIPublicPluginSetup {
    const actionTypeRegistry = this.actionTypeRegistry;
    const ruleTypeRegistry = this.ruleTypeRegistry;
    this.connectorServices = {
      validateEmailAddresses: plugins.actions.validateEmailAddresses,
    };

    ExperimentalFeaturesService.init({ experimentalFeatures: this.experimentalFeatures });

    const featureTitle = i18n.translate('xpack.triggersActionsUI.managementSection.displayName', {
      defaultMessage: 'Rules',
    });
    const featureDescription = i18n.translate(
      'xpack.triggersActionsUI.managementSection.displayDescription',
      {
        defaultMessage: 'Detect conditions using rules.',
      }
    );
    const alertsFeatureTitle = i18n.translate(
      'xpack.triggersActionsUI.managementSection.alerts.displayName',
      {
        defaultMessage: 'Alerts',
      }
    );
    const alertsFeatureDescription = i18n.translate(
      'xpack.triggersActionsUI.managementSection.alerts.displayDescription',
      {
        defaultMessage: 'Monitor all of your alerts in one place',
      }
    );
    const connectorsFeatureTitle = i18n.translate(
      'xpack.triggersActionsUI.managementSection.connectors.displayName',
      {
        defaultMessage: 'Connectors',
      }
    );
    const connectorsFeatureDescription = i18n.translate(
      'xpack.triggersActionsUI.managementSection.connectors.displayDescription',
      {
        defaultMessage: 'Connect third-party software with your alerting data.',
      }
    );

    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: PLUGIN_ID,
        title: featureTitle,
        description: featureDescription,
        icon: 'watchesApp',
        path: triggersActionsRoute,
        showOnHomePage: false,
        category: 'admin',
      });
      plugins.home.featureCatalogue.register({
        id: CONNECTORS_PLUGIN_ID,
        title: connectorsFeatureTitle,
        description: connectorsFeatureDescription,
        icon: 'watchesApp',
        path: triggersActionsRoute,
        showOnHomePage: false,
        category: 'admin',
      });
    }

    plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: PLUGIN_ID,
      title: featureTitle,
      order: 1,
      async mount(params: ManagementAppMountParams) {
        const [coreStart, pluginsStart] = (await core.getStartServices()) as [
          CoreStart,
          PluginsStart,
          unknown
        ];

        const { renderApp } = await import('./application/rules_app');

        // The `/api/features` endpoint requires the "Global All" Kibana privilege. Users with a
        // subset of this privilege are not authorized to access this endpoint and will receive a 404
        // error that causes the Alerting view to fail to load.
        let kibanaFeatures: KibanaFeature[];
        try {
          kibanaFeatures = await pluginsStart.features.getFeatures();
        } catch (err) {
          kibanaFeatures = [];
        }

        return renderApp({
          ...coreStart,
          actions: plugins.actions,
          dashboard: pluginsStart.dashboard,
          cloud: plugins.cloud,
          data: pluginsStart.data,
          dataViews: pluginsStart.dataViews,
          dataViewEditor: pluginsStart.dataViewEditor,
          charts: pluginsStart.charts,
          alerting: pluginsStart.alerting,
          spaces: pluginsStart.spaces,
          unifiedSearch: pluginsStart.unifiedSearch,
          isCloud: Boolean(plugins.cloud?.isCloudEnabled),
          element: params.element,
          theme: params.theme,
          storage: new Storage(window.localStorage),
          setBreadcrumbs: params.setBreadcrumbs,
          history: params.history,
          actionTypeRegistry,
          ruleTypeRegistry,
          kibanaFeatures,
          licensing: pluginsStart.licensing,
          expressions: pluginsStart.expressions,
          isServerless: !!pluginsStart.serverless,
          fieldFormats: pluginsStart.fieldFormats,
          lens: pluginsStart.lens,
          fieldsMetadata: pluginsStart.fieldsMetadata,
        });
      },
    });

    plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: CONNECTORS_PLUGIN_ID,
      title: connectorsFeatureTitle,
      order: 2,
      async mount(params: ManagementAppMountParams) {
        const [coreStart, pluginsStart] = (await core.getStartServices()) as [
          CoreStart,
          PluginsStart,
          unknown
        ];

        const { renderApp } = await import('./application/connectors_app');

        // The `/api/features` endpoint requires the "Global All" Kibana privilege. Users with a
        // subset of this privilege are not authorized to access this endpoint and will receive a 404
        // error that causes the Alerting view to fail to load.
        let kibanaFeatures: KibanaFeature[];
        try {
          kibanaFeatures = await pluginsStart.features.getFeatures();
        } catch (err) {
          kibanaFeatures = [];
        }

        return renderApp({
          ...coreStart,
          actions: plugins.actions,
          dashboard: pluginsStart.dashboard,
          data: pluginsStart.data,
          dataViews: pluginsStart.dataViews,
          dataViewEditor: pluginsStart.dataViewEditor,
          charts: pluginsStart.charts,
          alerting: pluginsStart.alerting,
          spaces: pluginsStart.spaces,
          unifiedSearch: pluginsStart.unifiedSearch,
          isCloud: Boolean(plugins.cloud?.isCloudEnabled),
          element: params.element,
          theme$: params.theme$,
          storage: new Storage(window.localStorage),
          setBreadcrumbs: params.setBreadcrumbs,
          history: params.history,
          actionTypeRegistry,
          ruleTypeRegistry,
          kibanaFeatures,
        });
      },
    });

    if (this.experimentalFeatures.stackAlertsPage) {
      plugins.management.sections.section.insightsAndAlerting.registerApp({
        id: ALERTS_PAGE_ID,
        title: alertsFeatureTitle,
        capabilitiesId: PLUGIN_ID,
        order: 0,
        async mount(params: ManagementAppMountParams) {
          const { renderApp } = await import('./application/alerts_app');
          const [coreStart, pluginsStart] = (await core.getStartServices()) as [
            CoreStart,
            PluginsStart,
            unknown
          ];
          let kibanaFeatures: KibanaFeature[];
          try {
            kibanaFeatures = await pluginsStart.features.getFeatures();
          } catch (err) {
            kibanaFeatures = [];
          }

          return renderApp({
            ...coreStart,
            actions: plugins.actions,
            dashboard: pluginsStart.dashboard,
            data: pluginsStart.data,
            dataViews: pluginsStart.dataViews,
            dataViewEditor: pluginsStart.dataViewEditor,
            charts: pluginsStart.charts,
            alerting: pluginsStart.alerting,
            spaces: pluginsStart.spaces,
            unifiedSearch: pluginsStart.unifiedSearch,
            isCloud: Boolean(plugins.cloud?.isCloudEnabled),
            element: params.element,
            theme: params.theme,
            storage: new Storage(window.localStorage),
            setBreadcrumbs: params.setBreadcrumbs,
            history: params.history,
            actionTypeRegistry,
            ruleTypeRegistry,
            kibanaFeatures,
            licensing: pluginsStart.licensing,
            expressions: pluginsStart.expressions,
            isServerless: !!pluginsStart.serverless,
            fieldFormats: pluginsStart.fieldFormats,
            lens: pluginsStart.lens,
            fieldsMetadata: pluginsStart.fieldsMetadata,
          });
        },
      });
      if (plugins.home) {
        plugins.home.featureCatalogue.register({
          id: ALERTS_PAGE_ID,
          title: alertsFeatureTitle,
          description: alertsFeatureDescription,
          icon: 'watchesApp',
          path: triggersActionsRoute,
          showOnHomePage: false,
          category: 'admin',
        });
      }
    }

    return {
      actionTypeRegistry: this.actionTypeRegistry,
      ruleTypeRegistry: this.ruleTypeRegistry,
    };
  }

  public start(core: CoreStart, plugins: PluginsStart): TriggersAndActionsUIPublicPluginStart {
    return {
      actionTypeRegistry: this.actionTypeRegistry,
      ruleTypeRegistry: this.ruleTypeRegistry,
      getActionForm: (
        props: Omit<ActionAccordionFormProps, 'actionTypeRegistry' | 'setActions'> & {
          setActions: (actions: RuleAction[]) => void;
        }
      ) => {
        const { setActions, ...restProps } = props;
        return getActionFormLazy({
          ...restProps,
          // TODO remove this cast when every solution is ready to use system actions
          setActions: setActions as (actions: RuleUiAction[]) => void,
          actionTypeRegistry: this.actionTypeRegistry,
          connectorServices: this.connectorServices!,
        });
      },
      getAddConnectorFlyout: (props: Omit<CreateConnectorFlyoutProps, 'actionTypeRegistry'>) => {
        return getAddConnectorFlyoutLazy({
          ...props,
          actionTypeRegistry: this.actionTypeRegistry,
          connectorServices: this.connectorServices!,
        });
      },
      getEditConnectorFlyout: (props: Omit<EditConnectorFlyoutProps, 'actionTypeRegistry'>) => {
        return getEditConnectorFlyoutLazy({
          ...props,
          actionTypeRegistry: this.actionTypeRegistry,
          connectorServices: this.connectorServices!,
        });
      },
      getAlertsSearchBar: (props: AlertsSearchBarProps) => {
        return getAlertsSearchBarLazy(props);
      },
      getRuleStatusDropdown: (props: RuleStatusDropdownProps) => {
        return getRuleStatusDropdownLazy(props);
      },
      getRuleTagFilter: (props: RuleTagFilterProps) => {
        return getRuleTagFilterLazy(props);
      },
      getRuleStatusFilter: (props: RuleStatusFilterProps) => {
        return getRuleStatusFilterLazy(props);
      },
      getRuleTagBadge: <T extends RuleTagBadgeOptions>(props: RuleTagBadgeProps<T>) => {
        return getRuleTagBadgeLazy(props);
      },
      getRuleEventLogList: <T extends RuleEventLogListOptions>(props: RuleEventLogListProps<T>) => {
        return getRuleEventLogListLazy(props);
      },
      getGlobalRuleEventLogList: (props: GlobalRuleEventLogListProps) => {
        return getGlobalRuleEventLogListLazy(props);
      },
      getRulesListNotifyBadge: (props: RulesListNotifyBadgePropsWithApi) => {
        return getRulesListNotifyBadgeLazy(props);
      },
      getRulesList: (props: RulesListProps) => {
        return getRulesListLazy({
          connectorServices: this.connectorServices!,
          rulesListProps: props,
        });
      },
      getRuleDefinition: (
        props: Omit<RuleDefinitionProps, 'actionTypeRegistry' | 'ruleTypeRegistry'>
      ) => {
        return getRuleDefinitionLazy({
          ...props,
          actionTypeRegistry: this.actionTypeRegistry,
          ruleTypeRegistry: this.ruleTypeRegistry,
        });
      },
      getRuleStatusPanel: (props: RuleStatusPanelProps) => {
        return getRuleStatusPanelLazy(props);
      },
      getAlertSummaryWidget: (props: AlertSummaryWidgetProps) => {
        const dependencies: AlertSummaryWidgetDependencies['dependencies'] = {
          charts: plugins.charts,
          uiSettings: core.uiSettings,
        };
        return getAlertSummaryWidgetLazy({ ...props, dependencies });
      },
      getRuleSnoozeModal: (props: RuleSnoozeModalProps) => {
        return getRuleSnoozeModalLazy(props);
      },
      getRulesSettingsLink: () => {
        return getRulesSettingsLinkLazy();
      },
    };
  }

  public stop() {}
}
