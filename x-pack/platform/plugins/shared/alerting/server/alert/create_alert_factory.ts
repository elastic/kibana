/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { cloneDeep } from 'lodash';
import type { AlertInstanceContext as Context, AlertInstanceState as State } from '../types';
import type { PublicAlert } from './alert';
import { Alert } from './alert';
import { categorizeAlerts } from '../lib';
import { AlertCategory, filterFor } from '../alerts_client/alert_mapper';

export interface AlertFactory<S extends State, C extends Context, G extends string> {
  create: (id: string) => PublicAlert<S, C, G>;
  get: (id: string) => PublicAlert<S, C, G> | null;
  alertLimit: {
    getValue: () => number;
    setLimitReached: (reached: boolean) => void;
    checkLimitUsage: () => void;
  };
  hasReachedAlertLimit: () => boolean;
  done: () => AlertFactoryDoneUtils<S, C, G>;
}

export type PublicAlertFactory<S extends State, C extends Context, G extends string> = Pick<
  AlertFactory<S, C, G>,
  'create' | 'done'
> & {
  alertLimit: Pick<AlertFactory<S, C, G>['alertLimit'], 'getValue' | 'setLimitReached'>;
};

export interface AlertFactoryDoneUtils<S extends State, C extends Context, G extends string> {
  getRecoveredAlerts: () => Array<Alert<S, C, G>>;
}

export interface CreateAlertFactoryOpts<S extends State, C extends Context> {
  alerts: Map<string, Alert<S, C>>;
  logger: Logger;
  maxAlerts: number;
  autoRecoverAlerts: boolean;
  canSetRecoveryContext?: boolean;
}

export function createAlertFactory<S extends State, C extends Context, G extends string>({
  alerts,
  logger,
  maxAlerts,
  autoRecoverAlerts,
  canSetRecoveryContext = false,
}: CreateAlertFactoryOpts<S, C>): AlertFactory<S, C, G> {
  // Keep track of which alerts we started with so we can determine which have recovered
  const originalAlerts = cloneDeep(alerts);

  // Number of alerts reported
  let numAlertsCreated = 0;

  // Whether the number of alerts reported has reached max allowed
  let hasReachedAlertLimit = false;

  // Whether rule type has asked for the alert limit
  let hasRequestedAlertLimit = false;

  // Whether rule type has reported back if alert limit was reached
  let hasReportedLimitReached = false;

  let isDone = false;
  return {
    create: (id: string): PublicAlert<S, C, G> => {
      if (isDone) {
        throw new Error(`Can't create new alerts after calling done() in AlertsFactory.`);
      }

      if (numAlertsCreated++ >= maxAlerts) {
        hasReachedAlertLimit = true;
        throw new Error(`Rule reported more than ${maxAlerts} alerts.`);
      }

      if (!alerts.has(id)) {
        alerts.set(id, new Alert<S, C>(id));
      }

      return alerts.get(id)!;
    },
    get: (id: string): PublicAlert<S, C, G> | null => {
      return alerts.get(id) ?? null;
    },
    // namespace alert limit services for rule type executors to use
    alertLimit: {
      getValue: (): number => {
        hasRequestedAlertLimit = true;
        return maxAlerts;
      },
      setLimitReached: (reached: boolean) => {
        hasReportedLimitReached = true;
        hasReachedAlertLimit = reached;
      },
      checkLimitUsage: () => {
        // If the rule type has requested the value but never reported back, throw an error
        if (hasRequestedAlertLimit && !hasReportedLimitReached) {
          throw new Error(
            `Rule has not reported whether alert limit has been reached after requesting limit value!`
          );
        }
      },
    },
    hasReachedAlertLimit: (): boolean => hasReachedAlertLimit,
    done: (): AlertFactoryDoneUtils<S, C, G> => {
      isDone = true;
      return {
        getRecoveredAlerts: () => {
          if (!canSetRecoveryContext) {
            logger.debug(
              `Set doesSetRecoveryContext to true on rule type to get access to recovered alerts.`
            );
            return [];
          }
          if (!autoRecoverAlerts) {
            logger.debug(
              `Set autoRecoverAlerts to true on rule type to get access to recovered alerts.`
            );
            return [];
          }

          const categorizedAlerts = categorizeAlerts<S, C, G>({
            alerts,
            existingAlerts: originalAlerts,
            autoRecoverAlerts,
            startedAt: new Date().toISOString(),
          });
          return filterFor(categorizedAlerts, AlertCategory.Recovered).map(({ alert }) => alert);
        },
      };
    },
  };
}

export function getPublicAlertFactory<
  S extends State = State,
  C extends Context = Context,
  G extends string = string
>(alertFactory: AlertFactory<S, C, G>): PublicAlertFactory<S, C, G> {
  return {
    create: (...args): PublicAlert<S, C, G> => alertFactory.create(...args),
    alertLimit: {
      getValue: (): number => alertFactory.alertLimit.getValue(),
      setLimitReached: (...args): void => alertFactory.alertLimit.setLimitReached(...args),
    },
    done: (): AlertFactoryDoneUtils<S, C, G> => alertFactory.done(),
  };
}
