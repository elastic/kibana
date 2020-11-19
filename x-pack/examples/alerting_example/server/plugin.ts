/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import { PluginSetupContract as AlertingSetup } from '../../../plugins/alerts/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../plugins/features/server';

import { alertType as alwaysFiringAlert } from './alert_types/always_firing';
import { alertType as peopleInSpaceAlert } from './alert_types/astros';
import { INDEX_THRESHOLD_ID } from '../../../plugins/stack_alerts/server';
import { ALERTING_EXAMPLE_APP_ID } from '../common/constants';

// this plugin's dependendencies
export interface AlertingExampleDeps {
  alerts: AlertingSetup;
  features: FeaturesPluginSetup;
}

export class AlertingExamplePlugin implements Plugin<void, void, AlertingExampleDeps> {
  public setup(core: CoreSetup, { alerts, features }: AlertingExampleDeps) {
    alerts.registerType(alwaysFiringAlert);
    alerts.registerType(peopleInSpaceAlert);

    features.registerKibanaFeature({
      id: ALERTING_EXAMPLE_APP_ID,
      name: i18n.translate('alertsExample.featureRegistry.alertsExampleFeatureName', {
        defaultMessage: 'Alerts Example',
      }),
      app: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      category: DEFAULT_APP_CATEGORIES.management,
      alerting: [alwaysFiringAlert.id, peopleInSpaceAlert.id, INDEX_THRESHOLD_ID],
      privileges: {
        all: {
          alerting: {
            all: [alwaysFiringAlert.id, peopleInSpaceAlert.id, INDEX_THRESHOLD_ID],
          },
          savedObject: {
            all: [],
            read: [],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: [],
        },
        read: {
          alerting: {
            read: [alwaysFiringAlert.id, peopleInSpaceAlert.id, INDEX_THRESHOLD_ID],
          },
          savedObject: {
            all: [],
            read: [],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: [],
        },
      },
    });
  }

  public start() {}
  public stop() {}
}
