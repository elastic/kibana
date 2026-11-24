/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';

import type { DocLinks } from '@kbn/doc-links';

import { loadYaml } from '@kbn/yaml-loader';

import { AGENT_LOG_LEVELS, DEFAULT_LOG_LEVEL } from '../constants';
import { isValidDuration } from '../services/validate_duration';

import type { SettingsDefinition } from './types';

export const zodStringWithDurationValidation = z
  .string()
  .refine((val) => !val || isValidDuration(val), {
    message: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.downloadTimeoutValidationMessage',
      {
        defaultMessage: 'Must be a string with a time unit, e.g. 30s, 5m, 2h',
      }
    ),
  });

export const zodStringWithYamlValidation = z.string().refine(
  async (val) => {
    const yaml = await loadYaml();
    try {
      yaml.parse(val);
      return true;
    } catch {
      return false;
    }
  },
  {
    message: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.yamlValidationMessage', {
      defaultMessage: 'Must be a valid YAML string',
    }),
  }
);

export const getAgentPolicyAdvancedSettings = (
  docLinks?: DocLinks['fleet']
): SettingsDefinition[] => [
  {
    name: 'agent.limits.go_max_procs',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.goMaxProcsTitle', {
      defaultMessage: 'Limit CPU usage',
    }),
    learnMoreLink: docLinks?.agentPolicyLimitCpu,
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
    learnMoreLink: docLinks?.agentDownloadTimeout,
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
    learnMoreLink: docLinks?.elasticAgentStandaloneDownload,
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
    learnMoreLink: docLinks?.elasticAgentLogFileRetention,
    schema: zodStringWithDurationValidation,
    example_value: '10m',
  },
  {
    name: 'agent.logging.level',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingLevelTitle', {
      defaultMessage: 'Agent logging level',
    }),
    api_field: {
      name: 'agent_logging_level',
    },
    learnMoreLink: docLinks?.agentPolicyLogLevel,
    schema: z.enum(AGENT_LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
    example_value: 'info',
  },
  {
    name: 'agent.logging.to_files',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingToFilesTitle', {
      defaultMessage: 'Agent logging to files',
    }),
    api_field: {
      name: 'agent_logging_to_files',
    },
    learnMoreLink: docLinks?.elasticAgentLogFileRetention,
    schema: z.boolean().default(true),
    example_value: true,
  },
  {
    name: 'agent.logging.files.rotateeverybytes',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileSizeTitle', {
      defaultMessage: 'Agent logging file size limit',
    }),
    api_field: {
      name: 'agent_logging_files_rotateeverybytes',
    },
    learnMoreLink: docLinks?.elasticAgentLogFileRetention,
    schema: z.number().int().min(0),
    example_value: 10,
  },
  {
    name: 'agent.logging.files.keepfiles',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileLimitTitle', {
      defaultMessage: 'Agent logging number of files',
    }),
    api_field: {
      name: 'agent_logging_files_keepfiles',
    },
    learnMoreLink: docLinks?.elasticAgentLogFileRetention,
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
    api_field: {
      name: 'agent_logging_files_interval',
    },
    learnMoreLink: docLinks?.elasticAgentLogFileRetention,
    schema: zodStringWithDurationValidation,
    example_value: '10m',
  },
  {
    name: 'agent.monitoring._runtime_experimental',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.monitoringRuntimeTitle', {
      defaultMessage: 'Monitoring runtime (experimental)',
    }),
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
    name: 'agent.features.disable_policy_change_acks.enabled',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.disablePolicyChangeAcksTitle', {
      defaultMessage: 'Disable policy change acknowledgments',
    }),
    api_field: {
      name: 'agent_features_disable_policy_change_acks_enabled',
    },
    schema: z.boolean().default(false),
    example_value: true,
    checkboxLabel: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.disablePolicyChangeAcksCheckboxLabel',
      { defaultMessage: 'Disable' }
    ),
    hidden: true,
  },
  {
    name: 'agent.features.include_tags_in_events.enabled',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.includeTagsInEventsTitle', {
      defaultMessage: 'Include agent tags in events',
    }),
    api_field: {
      name: 'agent_features_include_tags_in_events_enabled',
    },
    schema: z.boolean().default(false),
    example_value: true,
    checkboxLabel: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.includeTagsInEventsCheckboxLabel',
      { defaultMessage: 'Enable' }
    ),
  },
  {
    name: 'agent.internal',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.internalYamlSettingsTitle', {
      defaultMessage: 'Advanced internal YAML settings',
    }),
    api_field: {
      name: 'agent_internal',
    },
    schema: zodStringWithYamlValidation,
    type: 'yaml',
    example_value: `'agent:\n internal:\n runtime:\n default: otel'`,
  },
];
