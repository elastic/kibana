/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FieldType } from 'ui/index_patterns';
import { i18n } from '@kbn/i18n';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';

interface Props {
  options: MetricsExplorerOptions;
  onChange: (groupBy: string | null) => void;
  fields: FieldType[];
}

export const MetricsExplorerGroupBy = ({ options, onChange, fields }: Props) => {
  const handleChange = useCallback(
    selectedOptions => {
      const groupBy = (selectedOptions.length === 1 && selectedOptions[0].label) || null;
      onChange(groupBy);
    },
    [onChange]
  );
  return (
    <EuiComboBox
      placeholder={i18n.translate('xpack.infra.metricsExplorer.groupByLabel', {
        defaultMessage: 'Everything',
      })}
      fullWidth
      singleSelection={true}
      selectedOptions={(options.groupBy && [{ label: options.groupBy }]) || []}
      options={fields
        .filter(f => f.aggregatable && f.type === 'string')
        .map(f => ({ label: f.name }))}
      onChange={handleChange}
      isClearable={true}
    />
  );
};
