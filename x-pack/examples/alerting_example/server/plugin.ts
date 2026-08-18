/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { ruleType as alwaysFiringRule } from './rule_types/always_firing';
import { ruleType as peopleInSpaceRule } from './rule_types/astros';
import { ruleType as patternRule } from './rule_types/pattern';
import { ALERTING_EXAMPLE_APP_ID } from '../common/constants';

const INDEX_THRESHOLD_ID = '.index-threshold';

const alertingFeatures = [
  {
    ruleTypeId: alwaysFiringRule.id,
    consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
  },
  {
    ruleTypeId: peopleInSpaceRule.id,
    consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
  },
  {
    ruleTypeId: INDEX_THRESHOLD_ID,
    consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
  },
  {
    ruleTypeId: patternRule.id,
    consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
  },
];

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class AlertingExamplePlugin extends Service {
  static readonly inject = ['alerting.setup', 'features.setup'];
  static readonly provide = 'alertingExample';

  constructor(ctx: Context) {
    super(ctx, 'alertingExample');
    const alerting = (ctx.get('alerting.setup') as any).contract;
    const features = (ctx.get('features.setup') as any).contract;
    alerting.registerType(alwaysFiringRule);
        alerting.registerType(peopleInSpaceRule);
        alerting.registerType(patternRule);

        features.registerKibanaFeature({
          id: ALERTING_EXAMPLE_APP_ID,
          name: i18n.translate('alertsExample.featureRegistry.alertsExampleFeatureName', {
            defaultMessage: 'Alerting Examples',
          }),
          app: [],
          management: {
            insightsAndAlerting: ['triggersActionsRules', 'triggersActionsAlerts'],
          },
          category: DEFAULT_APP_CATEGORIES.management,
          alerting: alertingFeatures,
          privileges: {
            all: {
              alerting: {
                rule: {
                  all: alertingFeatures,
                  enable: alertingFeatures,
                  manual_run: alertingFeatures,
                  manage_rule_settings: alertingFeatures,
                },
                alert: {
                  all: alertingFeatures,
                },
              },
              savedObject: {
                all: [],
                read: [],
              },
              management: {
                insightsAndAlerting: ['triggersActionsRules', 'triggersActionsAlerts'],
              },
              ui: [],
            },
            read: {
              alerting: {
                rule: {
                  read: alertingFeatures,
                },
                alert: {
                  read: alertingFeatures,
                },
              },
              savedObject: {
                all: [],
                read: [],
              },
              management: {
                insightsAndAlerting: ['triggersActionsRules', 'triggersActionsAlerts'],
              },
              ui: [],
            },
          },
        });
  }
}
