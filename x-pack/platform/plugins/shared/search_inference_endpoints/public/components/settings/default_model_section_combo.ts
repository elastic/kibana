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
import { getModelStatus } from '../../utils/eis_utils';
import { EisModelStatus } from '../../types';

export const noDefaultModelOption = (): EuiComboBoxOptionOption<string> => ({
  label: i18n.translate(
    'xpack.searchInferenceEndpoints.settings.globalModel.noDefaultOptionLabel',
    {
      defaultMessage: 'No default model',
    }
  ),
  value: NO_DEFAULT_MODEL,
});

export const connectorToGlobalModelComboOption = (
  c: InferenceConnector
): EuiComboBoxOptionOption<string> => {
  let label = c.name;
  if (c.metadata) {
    const modelStatus = getModelStatus(c.metadata);
    if (modelStatus === EisModelStatus.DeprecatedEOL) {
      label = i18n.translate(
        'xpack.searchInferenceEndpoints.settings.globalModel.eolSelectionOption',
        {
          defaultMessage: '{modelName} - End of Life',
          values: {
            modelName: c.name,
          },
        }
      );
    } else if (modelStatus === EisModelStatus.Deprecated) {
      label = i18n.translate(
        'xpack.searchInferenceEndpoints.settings.globalModel.deprecatedSelectionOption',
        {
          defaultMessage: '{modelName} - Deprecated',
          values: {
            modelName: c.name,
          },
        }
      );
    }
  }
  return { label, value: c.connectorId };
};

export const getGlobalModelComboOptions = (
  connectors: InferenceConnector[] | undefined,
  includeNoDefaultOption: boolean
): EuiComboBoxOptionOption<string>[] => {
  const preconfigured =
    connectors?.filter((c) => c.isPreconfigured).map(connectorToGlobalModelComboOption) ?? [];

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
