/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InferenceConnector } from '@kbn/inference-common';
import { NO_DEFAULT_MODEL } from '../../../common/constants';

export const noDefaultModelOption = (): EuiComboBoxOptionOption<string> => ({
  label: i18n.translate(
    'xpack.searchInferenceEndpoints.settings.globalModel.noDefaultOptionLabel',
    {
      defaultMessage: 'No default model',
    }
  ),
  value: NO_DEFAULT_MODEL,
});

export const getGlobalModelComboOptions = (
  connectors: InferenceConnector[] | undefined,
  includeNoDefaultOption: boolean
): EuiComboBoxOptionOption<string>[] => {
  const preconfigured =
    connectors
      ?.filter((c) => c.isPreconfigured)
      .map((c) => ({ label: c.name, value: c.connectorId })) ?? [];

  const custom =
    connectors
      ?.filter((c) => !c.isPreconfigured)
      .map((c) => ({ label: c.name, value: c.connectorId })) ?? [];

  const connectorGroups: EuiComboBoxOptionOption<string>[] = [
    {
      label: i18n.translate(
        'xpack.searchInferenceEndpoints.settings.globalModel.preconfiguredGroup',
        {
          defaultMessage: 'Pre-configured',
        }
      ),
      value: 'preconfigured',
      options: preconfigured,
    },
    {
      label: i18n.translate('xpack.searchInferenceEndpoints.settings.globalModel.customGroup', {
        defaultMessage: 'Custom models',
      }),
      value: 'custom',
      options: custom,
    },
  ];

  if (!includeNoDefaultOption) {
    return connectorGroups;
  }

  return [noDefaultModelOption(), ...connectorGroups];
};

export const getGlobalModelSelectedOptions = (
  value: string,
  options: EuiComboBoxOptionOption<string>[],
  includeNoDefaultOption: boolean
): EuiComboBoxOptionOption<string>[] => {
  if (value === NO_DEFAULT_MODEL) {
    return includeNoDefaultOption ? [noDefaultModelOption()] : [];
  }
  const findInOptions = (
    option: EuiComboBoxOptionOption<string>
  ): EuiComboBoxOptionOption<string>[] => {
    if (!option.options && option.value === value) return [option];
    if (option.options) return option.options.flatMap(findInOptions);
    return [];
  };
  return options.flatMap(findInOptions);
};
