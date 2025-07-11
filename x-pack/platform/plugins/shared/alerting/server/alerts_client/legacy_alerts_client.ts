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
import { toRawAlertInstances } from '../lib';
import { mapAlerts } from './mappers';

import type {
  AlertInstanceContext as Context,
  AlertInstanceState as State,
  WithoutReservedActionGroups,
} from '../types';
import type { RulesSettingsFlappingProperties } from '../../common/rules_settings';
import { DEFAULT_FLAPPING_SETTINGS } from '../../common/rules_settings';
import type { AlertRuleData, IAlertsClient, InitializeExecutionOpts, TrackedAlerts } from './types';
import { DEFAULT_MAX_ALERTS } from '../config';
import type { UntypedNormalizedRuleType } from '../rule_type_registry';
import type { MaintenanceWindowsService } from '../task_runner/maintenance_windows';
import type { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { categorizeAlerts } from '../lib/categorize_alerts';
import type { CategorizedAlert } from './mappers/types';
import { AlertCategory, filterFor } from './mappers/types';

export interface LegacyAlertsClientParams {
  alertingEventLogger: AlertingEventLogger;
  logger: Logger;
  maintenanceWindowsService?: MaintenanceWindowsService;
  request: KibanaRequest;
  rule: AlertRuleData;
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
    recovered: Map<string, Alert<S, C, G>>;
    trackedRecoveredAlerts: Map<string, Alert<S, C, G>>;
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
    return !!this.trackedAlerts.active.get(id);
  }

  public async processAlerts(shouldLogAlerts: boolean) {
    const currentTime = this.startedAtString ?? new Date().toISOString();
    const categorizedAlerts = categorizeAlerts<S, C, G>({
      alerts: this.reportedAlerts,
      existingAlerts: this.trackedAlerts.active,
      autoRecoverAlerts: this.options.ruleType.autoRecoverAlerts ?? true,
      startedAt: currentTime,
    });

    const mapperContext = {
      alertDelay: this.options.rule.alertDelay,
      alertsClientContext: this.options,
      flappingSettings: this.flappingSettings,
      hasReachedAlertLimit: this.alertFactory!.hasReachedAlertLimit(),
      maxAlerts: this.maxAlerts,
      previousActiveAlerts: this.trackedAlerts.active,
      previousRecoveredAlerts: this.trackedAlerts.recovered,
      ruleLogPrefix: this.ruleLogPrefix,
      shouldLogAlerts,
      startedAt: currentTime,
    };

    const processedAlerts = await mapAlerts(categorizedAlerts, mapperContext);

    const newAlerts = filterFor(processedAlerts, AlertCategory.New);
    const ongoingAlerts = filterFor(processedAlerts, AlertCategory.Ongoing);
    const recoveredAlerts = filterFor(processedAlerts, AlertCategory.Recovered);
    const ongoingRecoveredAlerts = filterFor(processedAlerts, AlertCategory.OngoingRecovered);

    const convertToMap = (alerts: Array<CategorizedAlert<S, C, G>>) =>
      alerts.reduce((map, { alert }) => {
        map.set(alert.getId(), alert);
        return map;
      }, new Map<string, Alert<S, C, G>>());

    this.processedAlerts.new = convertToMap(newAlerts);

    // active is new + ongoing alerts
    this.processedAlerts.active = convertToMap([...newAlerts, ...ongoingAlerts]);
    this.processedAlerts.trackedActiveAlerts = convertToMap([...newAlerts, ...ongoingAlerts]);
    this.processedAlerts.recovered = convertToMap(recoveredAlerts);

    // tracked recovered is recovered + ongoing recovered alerts
    this.processedAlerts.trackedRecoveredAlerts = convertToMap([
      ...recoveredAlerts,
      ...ongoingRecoveredAlerts,
    ]);

    // TODO - apm.currentTransaction.addLabels();
    // TODO - ruleRunMetricsStore
  }

  public getProcessedAlerts(
    type: 'new' | 'active' | 'trackedActiveAlerts' | 'recovered' | 'trackedRecoveredAlerts'
  ) {
    if (Object.hasOwn(this.processedAlerts, type)) {
      return this.processedAlerts[type];
    }

    return new Map();
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
