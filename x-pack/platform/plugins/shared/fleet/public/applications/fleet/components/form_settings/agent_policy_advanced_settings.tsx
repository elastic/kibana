/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinks } from '@kbn/doc-links';

import { DEFAULT_LOG_LEVEL } from '../../../../../common/constants';
import { getAgentPolicyAdvancedSettings } from '../../../../../common/settings';
import type { SettingsConfig } from '../../../../../common/settings/types';

const AGENT_POLICY_ADVANCED_SETTINGS_DESCRIPTIONS: Record<string, SettingsConfig['description']> = {
  'agent.limits.go_max_procs': () =>
    i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.goMaxProcsDescription', {
      defaultMessage: 'Limits the maximum number of CPUs that can be executing simultaneously.',
    }),
  'agent.download.timeout': () =>
    i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.downloadTimeoutDescription', {
      defaultMessage: 'Timeout for downloading the agent binary.',
    }),
  'agent.download.target_directory': () =>
    i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentDownloadTargetDirectoryDescription',
      {
        defaultMessage: 'The disk path to which the agent binary will be downloaded.',
      }
    ),
  'agent.logging.metrics.period': () =>
    i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentLoggingMetricsPeriodDescription',
      {
        defaultMessage: 'The frequency of logging the internal Elastic Agent metrics.',
      }
    ),
  'agent.logging.level': ({ renderer }) => (
    <FormattedMessage
      id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingLevelDescription"
      defaultMessage="Sets the log level for all the agents on the policy. The default log level is {level}."
      values={{ level: renderer.renderCode(DEFAULT_LOG_LEVEL) }}
    />
  ),
  'agent.logging.to_files': () => (
    <FormattedMessage
      id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingToFilesDescription"
      defaultMessage="Enables logging to rotating files."
    />
  ),
  'agent.logging.files.rotateeverybytes': () => (
    <FormattedMessage
      id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileSizeDescription"
      defaultMessage="Configure log file size limit in bytes. If limit is reached, log file will be automatically rotated."
    />
  ),
  'agent.logging.files.keepfiles': () => (
    <FormattedMessage
      id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileLimitDescription"
      defaultMessage="Number of rotated log files to keep. Oldest files will be deleted first."
    />
  ),
  'agent.logging.files.interval': () => (
    <FormattedMessage
      id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileIntervalDescription"
      defaultMessage="Enable log file rotation on time intervals in addition to size-based rotation, i.e. 1s, 1m , 1h, 24h."
    />
  ),
  'agent.monitoring._runtime_experimental': () => (
    <FormattedMessage
      id="xpack.fleet.settings.agentPolicyAdvanced.monitoringRuntimeDescription"
      defaultMessage="Change how the Beat inputs used for Elastic Agent self-monitored are executed."
    />
  ),
  'agent.features.disable_policy_change_acks.enabled': () =>
    i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.disablePolicyChangeAcksDescription', {
      defaultMessage:
        'Disable policy change acknowlegements from the Elastic Agent to Fleet. Policy changes will be communicated through regular checkins.',
    }),
  'agent.features.include_tags_in_events.enabled': () =>
    i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.includeTagsInEventsDescription', {
      defaultMessage:
        'When enabled, agent tags are forwarded to all event documents collected by the agent, allowing filtering by tags in Discover, dashboards, and alerts.',
    }),
  'agent.internal': () => (
    <FormattedMessage
      id="xpack.fleet.settings.agentPolicyAdvanced.internalYamlSettingsDescription"
      defaultMessage="Control advanced agent internal settings and feature flags. No stability guarantee is provided for these settings."
    />
  ),
};

/**
 * Returns the agent policy advanced settings together with their UI descriptions.
 */
export const getAgentPolicyAdvancedSettingsConfig = (
  docLinks?: DocLinks['fleet']
): SettingsConfig[] =>
  getAgentPolicyAdvancedSettings(docLinks).map((setting) => {
    const description = AGENT_POLICY_ADVANCED_SETTINGS_DESCRIPTIONS[setting.name];
    if (!description) {
      throw new Error(`Missing description for agent policy setting [${setting.name}]`);
    }
    return { ...setting, description };
  });
