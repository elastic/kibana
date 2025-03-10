/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TheHiveSeverity, TheHiveTLP, SUB_ACTION } from '../../../common/thehive/constants';

export const eventActionOptions = [
  {
    value: SUB_ACTION.PUSH_TO_SERVICE,
    text: i18n.translate(
      'xpack.stackConnectors.components.thehive.eventSelectCreateCaseOptionLabel',
      {
        defaultMessage: 'Create case',
      }
    ),
  },
  {
    value: SUB_ACTION.CREATE_ALERT,
    text: i18n.translate(
      'xpack.stackConnectors.components.thehive.eventSelectCreateAlertOptionLabel',
      {
        defaultMessage: 'Create alert',
      }
    ),
  },
];

export const severityOptions = [
  {
    value: TheHiveSeverity.LOW,
    text: i18n.translate(
      'xpack.stackConnectors.components.thehive.eventSelectSeverityLowOptionLabel',
      {
        defaultMessage: 'LOW',
      }
    ),
  },
  {
    value: TheHiveSeverity.MEDIUM,
    text: i18n.translate(
      'xpack.stackConnectors.components.thehive.eventSelectSeverityMediumOptionLabel',
      {
        defaultMessage: 'MEDIUM',
      }
    ),
  },
  {
    value: TheHiveSeverity.HIGH,
    text: i18n.translate(
      'xpack.stackConnectors.components.thehive.eventSelectSeverityHighOptionLabel',
      {
        defaultMessage: 'HIGH',
      }
    ),
  },
  {
    value: TheHiveSeverity.CRITICAL,
    text: i18n.translate(
      'xpack.stackConnectors.components.thehive.eventSelectSeverityCriticalOptionLabel',
      {
        defaultMessage: 'CRITICAL',
      }
    ),
  },
];

export const tlpOptions = [
  {
    value: TheHiveTLP.CLEAR,
    text: i18n.translate(
      'xpack.stackConnectors.components.thehive.eventSelectTlpClearOptionLabel',
      {
        defaultMessage: 'CLEAR',
      }
    ),
  },
  {
    value: TheHiveTLP.GREEN,
    text: i18n.translate(
      'xpack.stackConnectors.components.thehive.eventSelectTlpGreenOptionLabel',
      {
        defaultMessage: 'GREEN',
      }
    ),
  },
  {
    value: TheHiveTLP.AMBER,
    text: i18n.translate(
      'xpack.stackConnectors.components.thehive.eventSelectTlpAmberOptionLabel',
      {
        defaultMessage: 'AMBER',
      }
    ),
  },
  {
    value: TheHiveTLP.AMBER_STRICT,
    text: i18n.translate(
      'xpack.stackConnectors.components.thehive.eventSelectTlpAmberStrictOptionLabel',
      {
        defaultMessage: 'AMBER+STRICT',
      }
    ),
  },
  {
    value: TheHiveTLP.RED,
    text: i18n.translate('xpack.stackConnectors.components.thehive.eventSelectTlpRedOptionLabel', {
      defaultMessage: 'RED',
    }),
  },
];
