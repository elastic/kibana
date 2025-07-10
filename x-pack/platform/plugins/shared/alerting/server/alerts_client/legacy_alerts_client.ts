/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { cloneDeep, keys } from 'lodash';
import { Alert } from '../alert/alert';
import type { AlertFactory } from '../alert/create_alert_factory';
import { createAlertFactory, getPublicAlertFactory } from '../alert/create_alert_factory';
import { toRawAlertInstances, categorizeAlerts } from '../lib';
import { logAlerts } from '../task_runner/log_alerts';
import type {
  AlertInstanceContext as Context,
  AlertInstanceState as State,
  WithoutReservedActionGroups,
} from '../types';
import type { RulesSettingsFlappingProperties } from '../../common/rules_settings';
import { DEFAULT_FLAPPING_SETTINGS } from '../../common/rules_settings';
import type { IAlertsClient, InitializeExecutionOpts, LogAlertsOpts, TrackedAlerts } from './types';
import { DEFAULT_MAX_ALERTS } from '../config';
import type { UntypedNormalizedRuleType } from '../rule_type_registry';
import type { MaintenanceWindowsService } from '../task_runner/maintenance_windows';
import type { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { mapAlerts } from './alert_mapper';

export interface LegacyAlertsClientParams {
  alertingEventLogger: AlertingEventLogger;
  logger: Logger;
  maintenanceWindowsService?: MaintenanceWindowsService;
  request: KibanaRequest;
  ruleType: UntypedNormalizedRuleType;
  spaceId: string;
}

export class LegacyAlertsClient<
  S extends State,
  C extends Context,
  G extends string,
  R extends string
> implements IAlertsClient<{}, S, C, G, R>
{
  private maxAlerts: number = DEFAULT_MAX_ALERTS;
  private flappingSettings: RulesSettingsFlappingProperties = DEFAULT_FLAPPING_SETTINGS;
  private ruleLogPrefix = '';
  private startedAtString: string | null = null;

  // Alerts from the previous execution that are deserialized from the task state
  private trackedAlerts: TrackedAlerts<S, C> = {
    active: new Map(),
    recovered: new Map(),
  };

  // Alerts reported from the rule executor using the alert factory
  private reportedAlerts: Map<string, Alert<S, C>> = new Map();

  private processedAlerts: {
    new: Map<string, Alert<S, C, G>>;
    active: Map<string, Alert<S, C, G>>;
    trackedActiveAlerts: Map<string, Alert<S, C, G>>;
    recovered: Map<string, Alert<S, C, R>>;
    trackedRecoveredAlerts: Map<string, Alert<S, C, R>>;
  };

  private alertFactory?: AlertFactory<S, C, WithoutReservedActionGroups<G, R>>;

  constructor(private readonly options: LegacyAlertsClientParams) {
    this.processedAlerts = {
      new: new Map(),
      active: new Map(),
      trackedActiveAlerts: new Map(),
      recovered: new Map(),
      trackedRecoveredAlerts: new Map(),
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
      this.trackedAlerts.active.set(id, new Alert<S, C>(id, activeAlertsFromState[id]));
    }

    for (const id of keys(recoveredAlertsFromState)) {
      this.trackedAlerts.recovered.set(id, new Alert<S, C>(id, recoveredAlertsFromState[id]));
    }

    // Legacy alerts client creates a copy of the active tracked alerts
    // This copy is updated when rule executors report alerts back to the framework
    // while the original alert is preserved
    this.reportedAlerts = cloneDeep(this.trackedAlerts.active);

    this.alertFactory = createAlertFactory<S, C, WithoutReservedActionGroups<G, R>>({
      alerts: this.reportedAlerts,
      logger: this.options.logger,
      maxAlerts: this.maxAlerts,
      autoRecoverAlerts: this.options.ruleType.autoRecoverAlerts ?? true,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
    });
  }

  public getAlert(id: string) {
    return this.alertFactory?.get(id);
  }

  public isTrackedAlert(id: string) {
    return this.trackedAlerts.active.has(id);
  }

  public async processAlerts() {
    const currentTime = this.startedAtString ?? new Date().toISOString();
    const categorizedAlerts = categorizeAlerts<S, C, G, G>({
      alerts: this.reportedAlerts,
      existingAlerts: this.trackedAlerts.active,
      autoRecoverAlerts: this.options.ruleType.autoRecoverAlerts ?? true,
      startedAt: currentTime,
    });

    const mapperContext = {
      alertDelay: 0,
      alertsClientContext: this.options,
      flappingSettings: this.flappingSettings,
      hasReachedAlertLimit: this.alertFactory!.hasReachedAlertLimit(),
      maxAlerts: this.maxAlerts,
      previousActiveAlerts: this.trackedAlerts.active,
      previousRecoveredAlerts: this.trackedAlerts.recovered,
      startedAt: currentTime,
    };

    const processedAlerts = await mapAlerts(categorizedAlerts, mapperContext);

    // flapping
    // flapping recovery
    // query delay

    // this.processedAlerts.new = newAlerts;
    // this.processedAlerts.active = ongoingAlerts;
    // this.processedAlerts.trackedActiveAlerts = ongoingAlerts;
    // this.processedAlerts.recovered = recoveredAlerts;
    // this.processedAlerts.trackedRecoveredAlerts = recoveredAlerts;
  }

  public logAlerts({ ruleRunMetricsStore, shouldLogAlerts }: LogAlertsOpts) {
    logAlerts({
      logger: this.options.logger,
      alertingEventLogger: this.options.alertingEventLogger,
      newAlerts: this.processedAlerts.new,
      activeAlerts: this.processedAlerts.active,
      recoveredAlerts: this.processedAlerts.recovered,
      ruleLogPrefix: this.ruleLogPrefix,
      ruleRunMetricsStore,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
      shouldPersistAlerts: shouldLogAlerts,
    });
  }

  public getProcessedAlerts(
    type: 'new' | 'active' | 'trackedActiveAlerts' | 'recovered' | 'trackedRecoveredAlerts'
  ) {
    if (Object.hasOwn(this.processedAlerts, type)) {
      return this.processedAlerts[type];
    }

    return {};
  }

  public getRawAlertInstancesForState(shouldOptimizeTaskState?: boolean) {
    return toRawAlertInstances<S, C, G, R>(
      this.options.logger,
      this.maxAlerts,
      this.processedAlerts.trackedActiveAlerts,
      this.processedAlerts.trackedRecoveredAlerts,
      shouldOptimizeTaskState
    );
  }

  // public determineDelayedAlerts(opts: DetermineDelayedAlertsOpts) {
  //   const alerts = determineDelayedAlerts({
  //     newAlerts: this.processedAlerts.new,
  //     activeAlerts: this.processedAlerts.active,
  //     trackedActiveAlerts: this.processedAlerts.trackedActiveAlerts,
  //     recoveredAlerts: this.processedAlerts.recovered,
  //     trackedRecoveredAlerts: this.processedAlerts.trackedRecoveredAlerts,
  //     alertDelay: opts.alertDelay,
  //     startedAt: this.startedAtString,
  //     ruleRunMetricsStore: opts.ruleRunMetricsStore,
  //   });

  //   this.processedAlerts.new = alerts.newAlerts;
  //   this.processedAlerts.active = alerts.activeAlerts;
  //   this.processedAlerts.trackedActiveAlerts = alerts.trackedActiveAlerts;
  //   this.processedAlerts.recovered = alerts.recoveredAlerts;
  //   this.processedAlerts.trackedRecoveredAlerts = alerts.trackedRecoveredAlerts;
  // }

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
  public getTrackedExecutions() {
    return new Set([]);
  }
}
