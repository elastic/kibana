/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  TheHiveSeverity,
  TheHiveTLP,
  SUB_ACTION,
  TheHiveTemplate,
} from '../../../common/thehive/constants';

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

export const bodyOption: { [key: string]: string | null } = {
  [TheHiveTemplate.CUSTOM_TEMPLATE]: null,
  [TheHiveTemplate.COMPROMISED_USER_ACCOUNT_INVESTIGATION]:
    '{\r\n  "observables": [\r\n    {\r\n      "dataType": "mail",\r\n      "data": "{{#context.alerts}}{{user.email}}{{/context.alerts}}",\r\n      "tags": ["phishing", "targeted-user"]\r\n    },\r\n    {\r\n      "dataType": "other",\r\n      "data": "{{#context.alerts}}{{user.name}}{{/context.alerts}}",\r\n      "tags": ["username", "compromised-account", "unauthorized-access"]\r\n    }\r\n  ]\r\n}\r\n',
  [TheHiveTemplate.MALICIOUS_FILE_ANALYSIS]:
    '{\r\n  "observables": [\r\n    {\r\n      "dataType": "hash",\r\n      "data": "{{#context.alerts}}{{file.hash.md5}}{{/context.alerts}}",\r\n      "tags": ["malware", "file-analysis"]\r\n    },\r\n    {\r\n      "dataType": "hash",\r\n      "data": "{{#context.alerts}}{{file.hash.sha256}}{{/context.alerts}}",\r\n      "tags": ["malware", "suspicious-file"]\r\n    }\r\n  ]\r\n}',
  [TheHiveTemplate.SUSPICIOUS_NETWORK_ACTIVITY]:
    '{\r\n  "observables": [\r\n    {\r\n      "dataType": "ip",\r\n      "data": "{{#context.alerts}}{{threat.indicator.ip}}{{/context.alerts}}",\r\n      "tags": ["source", "malicious-activity"]\r\n    }\r\n  ]\r\n}\r\n',
};

export const testBodyOption: { [key: string]: string | null } = {
  [TheHiveTemplate.CUSTOM_TEMPLATE]: null,
  [TheHiveTemplate.COMPROMISED_USER_ACCOUNT_INVESTIGATION]: JSON.stringify(
    {
      observables: [
        {
          dataType: 'mail',
          data: 'john@example.com',
          tags: ['iam-user'],
        },
        {
          dataType: 'other',
          data: 'john',
          tags: ['username'],
        },
      ],
      procedures: [
        {
          patternId: 'T1132',
          occurDate: 1737103254000,
        },
      ],
    },
    null,
    2
  ),
  [TheHiveTemplate.MALICIOUS_FILE_ANALYSIS]: JSON.stringify(
    {
      observables: [
        {
          dataType: 'hash',
          data: '5d41402abc4b2a76b9719d911017c592',
          tags: ['md5'],
        },
      ],
      procedures: [
        {
          patternId: 'T1612',
          occurDate: 1737107904000,
          tactic: 'Defense Evasion',
        },
      ],
    },
    null,
    2
  ),
  [TheHiveTemplate.SUSPICIOUS_NETWORK_ACTIVITY]: JSON.stringify(
    {
      observables: [
        {
          dataType: 'ip',
          data: '127.0.0.1',
          tags: ['source'],
        },
      ],
      procedures: [
        {
          patternId: 'T1132',
          occurDate: 1737105104000,
          tactic: 'command-and-control',
        },
      ],
    },
    null,
    2
  ),
};

export const testCustomTemplatePlaceHolder = JSON.stringify(
  {
    observables: [
      {
        dataType: 'url',
        data: 'http://example.org',
      },
    ],
    procedures: [
      {
        patternId: 'TA0001',
        occurDate: 1640000000000,
        tactic: 'tactic-name',
      },
    ],
  },
  null,
  2
).replace(/ /g, '\u00A0');

export const ruleCustomTemplatePlaceHolder = JSON.stringify(
  {
    observables: [
      {
        dataType: 'url',
        data: '{{#context.alerts}}{{url.original}}{{/context.alerts}}',
      },
    ],
    procedures: [
      {
        patternId: '{{#context.alerts}}{{threat.technique.id}}{{/context.alerts}}',
        occurDate: 1640000000000,
        tactic: '{{#context.alerts}}{{threat.tactic.name}}{{/context.alerts}}',
      },
    ],
  },
  null,
  2
).replace(/ /g, '\u00A0');
