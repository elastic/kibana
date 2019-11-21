/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ConfigBlockSchema } from './domain_types';

export const supportedConfigLabelsMap = new Map<string, string>([
  [
    'filebeatInputConfig.paths.ui.label',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsLabel', {
      defaultMessage: 'Paths',
    }),
  ],
  [
    'filebeatInputConfig.paths.ui.helpText',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsDescription', {
      defaultMessage: 'Put each of the paths on a separate line',
    }),
  ],
  [
    'filebeatInputConfig.paths.error',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsErrorMessage', {
      defaultMessage: 'One file path per line',
    }),
  ],
  [
    'filebeatInputConfig.other.ui.label',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigLabel', {
      defaultMessage: 'Other Config',
    }),
  ],
  [
    'filebeatInputConfig.other.ui.helpText',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigDescription', {
      defaultMessage: 'Use YAML format to specify other settings for the Filebeat Input',
    }),
  ],
  [
    'filebeatInputConfig.other.error',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigErrorMessage', {
      defaultMessage: 'Use valid YAML format',
    }),
  ],
  [
    'filebeatModuleConfig.module.ui.label',
    i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleLabel', {
      defaultMessage: 'Module',
    }),
  ],
  [
    'filebeatModuleConfig.module.error',
    i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleErrorMessage', {
      defaultMessage: 'Please select a module',
    }),
  ],
  [
    'filebeatModuleConfig.other.ui.label',
    i18n.translate('xpack.beatsManagement.filebeatModuleConfig.otherConfigLabel', {
      defaultMessage: 'Other Config',
    }),
  ],
  [
    'filebeatModuleConfig.other.ui.helpText',
    i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleDescription', {
      defaultMessage: 'Use YAML format to specify other settings for the Filebeat Module',
    }),
  ],
  [
    'filebeatModuleConfig.other.error',
    i18n.translate('xpack.beatsManagement.filebeatModuleConfig.otherConfigErrorMessage', {
      defaultMessage: 'Use valid YAML format',
    }),
  ],

  [
    'metricbeatModuleConfig.module.ui.label',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.moduleLabel', {
      defaultMessage: 'Module',
    }),
  ],
  [
    'metricbeatModuleConfig.module.error',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.moduleErrorMessage', {
      defaultMessage: 'Please select a module',
    }),
  ],
  [
    'metricbeatModuleConfig.hosts.ui.label',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsLabel', {
      defaultMessage: 'Hosts',
    }),
  ],
  [
    'metricbeatModuleConfig.hosts.ui.helpText',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsDescription', {
      defaultMessage: 'Put each of the paths on a seperate line',
    }),
  ],
  [
    'metricbeatModuleConfig.hosts.error',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsErrorMessage', {
      defaultMessage: 'One file host per line',
    }),
  ],
  [
    'metricbeatModuleConfig.period.ui.label',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.periodLabel', {
      defaultMessage: 'Period',
    }),
  ],
  [
    'metricbeatModuleConfig.period.error',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.periodErrorMessage', {
      defaultMessage: 'Invalid Period, must be formatted as `10s` for 10 seconds',
    }),
  ],
  [
    'metricbeatModuleConfig.other.ui.label',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.otherConfigLabel', {
      defaultMessage: 'Other Config',
    }),
  ],
  [
    'metricbeatModuleConfig.other.ui.helpText',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.otherConfigDescription', {
      defaultMessage: 'Use YAML format to specify other settings for the Metricbeat Module',
    }),
  ],
  [
    'metricbeatModuleConfig.other.error',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.otherConfigErrorMessage', {
      defaultMessage: 'Use valid YAML format',
    }),
  ],

  [
    'outputConfig.output.ui.label',
    i18n.translate('xpack.beatsManagement.outputConfig.outputTypeLabel', {
      defaultMessage: 'Output Type',
    }),
  ],
  [
    'outputConfig.output.error',
    i18n.translate('xpack.beatsManagement.outputConfig.outputTypeErrorMessage', {
      defaultMessage: 'Please select an output type',
    }),
  ],
  [
    'outputConfig.hosts.ui.label',
    i18n.translate('xpack.beatsManagement.outputConfig.hostsLabel', {
      defaultMessage: 'Hosts',
    }),
  ],
  [
    'outputConfig.hosts.error',
    i18n.translate('xpack.beatsManagement.outputConfig.hostsErrorMessage', {
      defaultMessage: 'One file host per line',
    }),
  ],
  [
    'outputConfig.username.ui.label',
    i18n.translate('xpack.beatsManagement.outputConfig.usernameLabel', {
      defaultMessage: 'Username',
    }),
  ],
  [
    'outputConfig.username.error',
    i18n.translate('xpack.beatsManagement.outputConfig.usernameErrorMessage', {
      defaultMessage: 'Unprocessable username',
    }),
  ],
  [
    'outputConfig.password.ui.label',
    i18n.translate('xpack.beatsManagement.outputConfig.passwordLabel', {
      defaultMessage: 'Password',
    }),
  ],
  [
    'outputConfig.password.error',
    i18n.translate('xpack.beatsManagement.outputConfig.passwordErrorMessage', {
      defaultMessage: 'Unprocessable password',
    }),
  ],

  [
    'supportedConfigs.filebeat.input.text',
    i18n.translate('xpack.beatsManagement.tagConfig.filebeatInputLabel', {
      defaultMessage: 'Filebeat Input',
    }),
  ],
  [
    'supportedConfigs.filebeat.modules.text',
    i18n.translate('xpack.beatsManagement.tagConfig.filebeatModuleLabel', {
      defaultMessage: 'Filebeat Module',
    }),
  ],
  [
    'supportedConfigs.metricbeatModule.text',
    i18n.translate('xpack.beatsManagement.tagConfig.metricbeatModuleLabel', {
      defaultMessage: 'Metricbeat Module',
    }),
  ],
  [
    'supportedConfigs.output.text',
    i18n.translate('xpack.beatsManagement.tagConfig.outputLabel', {
      defaultMessage: 'Output',
    }),
  ],
]);

export let translatedConfigs: ConfigBlockSchema[];
export const translateConfigSchema = (schemas: ConfigBlockSchema[]) => {
  if (translatedConfigs) {
    return translatedConfigs;
  }

  translatedConfigs = schemas.map(schema => {
    schema.name = supportedConfigLabelsMap.get(`supportedConfigs.${schema.id}.text`) || schema.name;

    schema.configs = schema.configs.map(configBlock => {
      if (configBlock.ui.label) {
        configBlock.ui.label =
          supportedConfigLabelsMap.get(configBlock.ui.labelId || '') || configBlock.ui.label;
      }
      if (configBlock.ui.helpText) {
        configBlock.ui.helpText =
          supportedConfigLabelsMap.get(configBlock.ui.helpTextId || '') || configBlock.ui.helpText;
      }
      if (configBlock.error) {
        configBlock.error =
          supportedConfigLabelsMap.get(configBlock.errorId || '') || configBlock.error;
      }
      return configBlock;
    });
    return schema;
  });

  return translatedConfigs;
};
