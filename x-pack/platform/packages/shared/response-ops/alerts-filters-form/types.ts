/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ComponentType } from 'react';

export type AlertsFilterComponentType<T> = ComponentType<{
  value?: T;
  onChange: (newValue: T) => void;
  isDisabled?: boolean;
  error?: string;
}>;

export interface AlertsFilter<T = unknown> {
  type?: AlertsFiltersType;
  value?: T;
}

export interface AlertsFilterMetadata<T> {
  id: AlertsFiltersType;
  displayName: string;
  component: AlertsFilterComponentType<T>;
  isEmpty: (value?: T) => boolean;
  toKql: (value?: T) => string | null;
}

export interface AlertsFiltersFormContextValue {
  /**
   * Pre-selected rule type ids for authorization
   */
  ruleTypeIds: string[];

  services: {
    http: HttpStart;
    notifications: NotificationsStart;
  };
}

export type AlertsFiltersType = 'ruleTags' | 'ruleTypes';

export type AlertsFiltersExpressionOperator = 'and' | 'or';

export type AlertsFiltersExpressionItem =
  | {
      operator: AlertsFiltersExpressionOperator;
    }
  | {
      filter: AlertsFilter;
    };

export type AlertsFiltersExpression = AlertsFiltersExpressionItem[];

export type AlertsFiltersExpressionErrors = Array<{ type?: string; value?: string } | undefined>;
