/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest, Logger } from '@kbn/core/server';
import { cloneDeep, keys, merge } from 'lodash';
import { Alert } from '../alert/alert';
import {
  AlertFactory,
  createAlertFactory,
  getPublicAlertFactory,
} from '../alert/create_alert_factory';
import {
  determineAlertsToReturn,
  processAlerts,
  setFlapping,
  getAlertsForNotification,
} from '../lib';
import { trimRecoveredAlerts } from '../lib/trim_recovered_alerts';
import { logAlerts } from '../task_runner/log_alerts';
import { AlertInstanceContext, AlertInstanceState, WithoutReservedActionGroups } from '../types';
import {
  DEFAULT_FLAPPING_SETTINGS,
  RulesSettingsFlappingProperties,
} from '../../common/rules_settings';
import {
  IAlertsClient,
  InitializeExecutionOpts,
  ProcessAlertsOpts,
  LogAlertsOpts,
  TrackedAlerts,
} from './types';
import { DEFAULT_MAX_ALERTS } from '../config';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { MaintenanceWindowsService } from '../task_runner/maintenance_windows';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';

export interface LegacyAlertsClientParams {
  alertingEventLogger: AlertingEventLogger;
  logger: Logger;
  maintenanceWindowsService?: MaintenanceWindowsService;
  request: KibanaRequest;
  ruleType: UntypedNormalizedRuleType;
  spaceId: string;
}

export class LegacyAlertsClient<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> implements IAlertsClient<{}, State, Context, ActionGroupIds, RecoveryActionGroupId>
{
  private maxAlerts: number = DEFAULT_MAX_ALERTS;
  private flappingSettings: RulesSettingsFlappingProperties = DEFAULT_FLAPPING_SETTINGS;
  private ruleLogPrefix: string = '';
  private startedAtString: string | null = null;

  // Alerts from the previous execution that are deserialized from the task state
  private trackedAlerts: TrackedAlerts<State, Context> = {
    active: {},
    recovered: {},
  };

  // Alerts reported from the rule executor using the alert factory
  private reportedAlerts: Record<string, Alert<State, Context>> = {};

  private processedAlerts: {
    new: Record<string, Alert<State, Context, ActionGroupIds>>;
    active: Record<string, Alert<State, Context, ActionGroupIds>>;
    activeCurrent: Record<string, Alert<State, Context, ActionGroupIds>>;
    recovered: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
    recoveredCurrent: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  };

  private alertFactory?: AlertFactory<
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;

  constructor(private readonly options: LegacyAlertsClientParams) {
    this.processedAlerts = {
      new: {},
      active: {},
      activeCurrent: {},
      recovered: {},
      recoveredCurrent: {},
    };
  }

  public async initializeExecution({
    maxAlerts,
    ruleLabel,
    startedAt,
    flappingSettings,
    activeAlertsFromState,
    recoveredAlertsFromState,
  }: InitializeExecutionOpts) {
    this.maxAlerts = maxAlerts;
    this.flappingSettings = flappingSettings;
    this.ruleLogPrefix = ruleLabel;
    this.startedAtString = startedAt ? startedAt.toISOString() : null;

    for (const id of keys(activeAlertsFromState)) {
      this.trackedAlerts.active[id] = new Alert<State, Context>(id, activeAlertsFromState[id]);
    }

    for (const id of keys(recoveredAlertsFromState)) {
      this.trackedAlerts.recovered[id] = new Alert<State, Context>(
        id,
        recoveredAlertsFromState[id]
      );
    }

    // Legacy alerts client creates a copy of the active tracked alerts
    // This copy is updated when rule executors report alerts back to the framework
    // while the original alert is preserved
    this.reportedAlerts = cloneDeep(this.trackedAlerts.active);

    this.alertFactory = createAlertFactory<
      State,
      Context,
      WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
    >({
      alerts: this.reportedAlerts,
      logger: this.options.logger,
      maxAlerts: this.maxAlerts,
      autoRecoverAlerts: this.options.ruleType.autoRecoverAlerts ?? true,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
    });
  }

  public getTrackedAlerts() {
    return this.trackedAlerts;
  }

  public getAlert(id: string) {
    return this.alertFactory?.get(id);
  }

  public isTrackedAlert(id: string) {
    return !!this.trackedAlerts.active[id];
  }

  public async processAlerts({
    flappingSettings,
    alertDelay,
    ruleRunMetricsStore,
  }: ProcessAlertsOpts) {
    const {
      newAlerts: processedAlertsNew,
      activeAlerts: processedAlertsActive,
      currentRecoveredAlerts: processedAlertsRecoveredCurrent,
      recoveredAlerts: processedAlertsRecovered,
    } = processAlerts<State, Context, ActionGroupIds, RecoveryActionGroupId>({
      alerts: this.reportedAlerts,
      existingAlerts: this.trackedAlerts.active,
      previouslyRecoveredAlerts: this.trackedAlerts.recovered,
      hasReachedAlertLimit: this.alertFactory!.hasReachedAlertLimit(),
      alertLimit: this.maxAlerts,
      autoRecoverAlerts: this.options.ruleType.autoRecoverAlerts ?? true,
      flappingSettings,
      startedAt: this.startedAtString,
    });

    if (this.options.maintenanceWindowsService) {
      // load maintenance windows if there are any any alerts (new, active, recovered)
      // this is because we need the MW IDs for any active or recovered alerts that may
      // have started during the MW period.
      if (
        keys(processedAlertsNew).length > 0 ||
        keys(processedAlertsActive).length > 0 ||
        keys(processedAlertsRecovered).length > 0
      ) {
        const { maintenanceWindowsWithoutScopedQueryIds } =
          await this.options.maintenanceWindowsService.getMaintenanceWindows({
            eventLogger: this.options.alertingEventLogger,
            request: this.options.request,
            ruleTypeCategory: this.options.ruleType.category,
            spaceId: this.options.spaceId,
          });

        for (const id in processedAlertsNew) {
          if (Object.hasOwn(processedAlertsNew, id)) {
            processedAlertsNew[id].setMaintenanceWindowIds(maintenanceWindowsWithoutScopedQueryIds);
          }
        }
      }
    }

    const { trimmedAlertsRecovered, earlyRecoveredAlerts } = trimRecoveredAlerts(
      this.options.logger,
      processedAlertsRecovered,
      this.maxAlerts
    );

    const alerts = getAlertsForNotification<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      flappingSettings,
      this.options.ruleType.defaultActionGroupId,
      alertDelay,
      processedAlertsNew,
      processedAlertsActive,
      trimmedAlertsRecovered,
      processedAlertsRecoveredCurrent,
      this.startedAtString
    );
    ruleRunMetricsStore.setNumberOfDelayedAlerts(alerts.delayedAlertsCount);
    alerts.currentRecoveredAlerts = merge(alerts.currentRecoveredAlerts, earlyRecoveredAlerts);

    this.processedAlerts.new = alerts.newAlerts;
    this.processedAlerts.active = alerts.activeAlerts;
    this.processedAlerts.activeCurrent = alerts.currentActiveAlerts;
    this.processedAlerts.recovered = alerts.recoveredAlerts;
    this.processedAlerts.recoveredCurrent = alerts.currentRecoveredAlerts;
  }

  public logAlerts({ ruleRunMetricsStore, shouldLogAlerts }: LogAlertsOpts) {
    logAlerts({
      logger: this.options.logger,
      alertingEventLogger: this.options.alertingEventLogger,
      newAlerts: this.processedAlerts.new,
      activeAlerts: this.processedAlerts.activeCurrent,
      recoveredAlerts: this.processedAlerts.recoveredCurrent,
      ruleLogPrefix: this.ruleLogPrefix,
      ruleRunMetricsStore,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
      shouldPersistAlerts: shouldLogAlerts,
    });
  }

  public getProcessedAlerts(
    type: 'new' | 'active' | 'activeCurrent' | 'recovered' | 'recoveredCurrent'
  ) {
    if (Object.hasOwn(this.processedAlerts, type)) {
      return this.processedAlerts[type];
    }

    return {};
  }

  public getAlertsToSerialize(shouldSetFlappingAndOptimize: boolean = true) {
    if (shouldSetFlappingAndOptimize) {
      setFlapping<State, Context, ActionGroupIds, RecoveryActionGroupId>(
        this.flappingSettings,
        this.processedAlerts.active,
        this.processedAlerts.recovered
      );
    }
    return determineAlertsToReturn<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      this.processedAlerts.active,
      this.processedAlerts.recovered,
      shouldSetFlappingAndOptimize
    );
  }

  public hasReachedAlertLimit(): boolean {
    return this.alertFactory!.hasReachedAlertLimit();
  }

  public getMaxAlertLimit(): number {
    return this.maxAlerts;
  }

  public checkLimitUsage() {
    return this.alertFactory!.alertLimit.checkLimitUsage();
  }

  public factory() {
    return getPublicAlertFactory(this.alertFactory!);
  }

  public client() {
    return null;
  }

  public async persistAlerts() {
    return null;
  }

  public async setAlertStatusToUntracked() {
    return;
  }
}
