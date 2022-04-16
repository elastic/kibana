/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
// import directly to support examples functional tests (@kbn-test/src/functional_tests/lib/babel_register_for_test_plugins.js)
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/utils/default_app_categories';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';

import { alertType as alwaysFiringAlert } from './alert_types/always_firing';
import { alertType as peopleInSpaceAlert } from './alert_types/astros';
// can't import static code from another plugin to support examples functional test
const INDEX_THRESHOLD_ID = '.index-threshold';
import { ALERTING_EXAMPLE_APP_ID } from '../common/constants';

// this plugin's dependencies
export interface AlertingExampleDeps {
  alerting: AlertingSetup;
  features: FeaturesPluginSetup;
}

export class AlertingExamplePlugin implements Plugin<void, void, AlertingExampleDeps> {
  public setup(core: CoreSetup, { alerting, features }: AlertingExampleDeps) {
    alerting.registerType(alwaysFiringAlert);
    alerting.registerType(peopleInSpaceAlert);

    features.registerKibanaFeature({
      id: ALERTING_EXAMPLE_APP_ID,
      name: i18n.translate('alertsExample.featureRegistry.alertsExampleFeatureName', {
        defaultMessage: 'Alerting Examples',
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
            rule: {
              all: [alwaysFiringAlert.id, peopleInSpaceAlert.id, INDEX_THRESHOLD_ID],
            },
            alert: {
              all: [alwaysFiringAlert.id, peopleInSpaceAlert.id, INDEX_THRESHOLD_ID],
            },
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
            rule: {
              read: [alwaysFiringAlert.id, peopleInSpaceAlert.id, INDEX_THRESHOLD_ID],
            },
            alert: {
              read: [alwaysFiringAlert.id, peopleInSpaceAlert.id, INDEX_THRESHOLD_ID],
            },
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
