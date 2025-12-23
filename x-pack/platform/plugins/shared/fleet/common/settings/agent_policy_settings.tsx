/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { load } from 'js-yaml';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { z } from '@kbn/zod';

import { AGENT_LOG_LEVELS, DEFAULT_LOG_LEVEL } from '../constants';

import type { SettingsConfig } from './types';

export const zodStringWithDurationValidation = z
  .string()
  .refine((val) => val.match(/^(\d+[s|m|h])?$/), {
    message: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.downloadTimeoutValidationMessage',
      {
        defaultMessage: 'Must be a string with a time unit, e.g. 30s, 5m, 2h',
      }
    ),
  });

export const zodStringWithYamlValidation = z.string().refine(
  (val) => {
    try {
      load(val);
      return true;
    } catch (error) {
      return false;
    }
  },
  {
    message: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.yamlValidationMessage', {
      defaultMessage: 'Must be a valid YAML string',
    }),
  }
);

export const AGENT_POLICY_ADVANCED_SETTINGS: SettingsConfig[] = [
  {
    name: 'agent.limits.go_max_procs',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.goMaxProcsTitle', {
      defaultMessage: 'Limit CPU usage',
    }),
    description: () =>
      i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.goMaxProcsDescription', {
        defaultMessage: 'Limits the maximum number of CPUs that can be executing simultaneously.',
      }),
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/agent-policy.html#agent-policy-limit-cpu',
    api_field: {
      name: 'agent_limits_go_max_procs',
    },
    schema: z.number().int().min(0),
    example_value: 10,
  },
  {
    name: 'agent.download.timeout',
    hidden: true,
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.downloadTimeoutTitle', {
      defaultMessage: 'Agent binary download timeout',
    }),
    description: () =>
      i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.downloadTimeoutDescription', {
        defaultMessage: 'Timeout for downloading the agent binary.',
      }),
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/enable-custom-policy-settings.html#configure-agent-download-timeout',
    api_field: {
      name: 'agent_download_timeout',
    },
    schema: zodStringWithDurationValidation,
    example_value: '10m',
  },
  {
    name: 'agent.download.target_directory',
    hidden: true,
    api_field: {
      name: 'agent_download_target_directory',
    },
    title: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentDownloadTargetDirectoryTitle',
      {
        defaultMessage: 'Agent binary target directory',
      }
    ),
    description: () =>
      i18n.translate(
        'xpack.fleet.settings.agentPolicyAdvanced.agentDownloadTargetDirectoryDescription',
        {
          defaultMessage: 'The disk path to which the agent binary will be downloaded.',
        }
      ),
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-download.html',
    schema: z.string(),
    example_value: '/tmp/test',
  },
  {
    name: 'agent.logging.metrics.period',
    hidden: true,
    api_field: {
      name: 'agent_logging_metrics_period',
    },
    title: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentLoggingMetricsPeriodTitle',
      {
        defaultMessage: 'Agent logging metrics period',
      }
    ),
    description: () =>
      i18n.translate(
        'xpack.fleet.settings.agentPolicyAdvanced.agentLoggingMetricsPeriodDescription',
        {
          defaultMessage: 'The frequency of logging the internal Elastic Agent metrics.',
        }
      ),
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-logging-config.html#elastic-agent-standalone-logging-settings',
    schema: zodStringWithDurationValidation,
    example_value: '10m',
  },
  {
    name: 'agent.logging.level',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingLevelTitle', {
      defaultMessage: 'Agent logging level',
    }),
    description: ({ renderer }) => (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingLevelDescription"
        defaultMessage="Sets the log level for all the agents on the policy. The default log level is {level}."
        values={{ level: renderer.renderCode(DEFAULT_LOG_LEVEL) }}
      />
    ),
    api_field: {
      name: 'agent_logging_level',
    },
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/agent-policy.html#agent-policy-log-level',
    schema: z.enum(AGENT_LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
    example_value: 'info',
  },
  {
    name: 'agent.logging.to_files',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingToFilesTitle', {
      defaultMessage: 'Agent logging to files',
    }),
    description: () => (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingToFilesDescription"
        defaultMessage="Enables logging to rotating files."
      />
    ),
    api_field: {
      name: 'agent_logging_to_files',
    },
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-logging-config.html#elastic-agent-standalone-logging-settings',
    schema: z.boolean().default(true),
    example_value: true,
  },
  {
    name: 'agent.logging.files.rotateeverybytes',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileSizeTitle', {
      defaultMessage: 'Agent logging file size limit',
    }),
    description: () => (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileSizeDescription"
        defaultMessage="Configure log file size limit in bytes. If limit is reached, log file will be automatically rotated."
      />
    ),
    api_field: {
      name: 'agent_logging_files_rotateeverybytes',
    },
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-logging-config.html#elastic-agent-standalone-logging-settings',
    schema: z.number().int().min(0),
    example_value: 10,
  },
  {
    name: 'agent.logging.files.keepfiles',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileLimitTitle', {
      defaultMessage: 'Agent logging number of files',
    }),
    description: () => (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileLimitDescription"
        defaultMessage="Number of rotated log files to keep. Oldest files will be deleted first."
      />
    ),
    api_field: {
      name: 'agent_logging_files_keepfiles',
    },
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-logging-config.html#elastic-agent-standalone-logging-settings',
    schema: z.number().int().min(0),
    example_value: 10,
  },
  {
    name: 'agent.logging.files.interval',
    title: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileIntervalTitle',
      {
        defaultMessage: 'Agent logging file rotation interval',
      }
    ),
    description: () => (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileIntervalDescription"
        defaultMessage="Enable log file rotation on time intervals in addition to size-based rotation, i.e. 1s, 1m , 1h, 24h."
      />
    ),
    api_field: {
      name: 'agent_logging_files_interval',
    },
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-logging-config.html#elastic-agent-standalone-logging-settings',
    schema: zodStringWithDurationValidation,
    example_value: '10m',
  },
  {
    name: 'agent.monitoring._runtime_experimental',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.monitoringRuntimeTitle', {
      defaultMessage: 'Monitoring runtime (experimental)',
    }),
    description: () => (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.monitoringRuntimeDescription"
        defaultMessage="Change how the Beat inputs used for Elastic Agent self-monitored are executed."
      />
    ),
    api_field: {
      name: 'agent_monitoring_runtime_experimental',
    },
    schema: z.enum(['', 'process', 'otel']).default(''),
    example_value: 'otel',
    options: [
      {
        value: '',
        text: i18n.translate(
          'xpack.fleet.settings.agentPolicyAdvanced.monitoringRuntimeDefaultLabel',
          {
            defaultMessage: 'Default',
          }
        ),
      },
      {
        value: 'process',
        text: i18n.translate(
          'xpack.fleet.settings.agentPolicyAdvanced.monitoringRuntimeProcessLabel',
          {
            defaultMessage: 'Process',
          }
        ),
      },
      {
        value: 'otel',
        text: i18n.translate(
          'xpack.fleet.settings.agentPolicyAdvanced.monitoringRuntimeOtelLabel',
          {
            defaultMessage: 'OTel',
          }
        ),
      },
    ],
  },
  {
    name: 'agent.internal',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.internalYamlSettingsTitle', {
      defaultMessage: 'Advanced internal YAML settings',
    }),
    description: () => (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.internalYamlSettingsDescription"
        defaultMessage="Control advanced agent internal settings and feature flags. No stability guarantee is provided for these settings."
      />
    ),
    api_field: {
      name: 'agent_internal',
    },
    schema: zodStringWithYamlValidation,
    type: 'yaml',
    example_value: `'agent:\n internal:\n runtime:\n default: otel'`,
  },
];
