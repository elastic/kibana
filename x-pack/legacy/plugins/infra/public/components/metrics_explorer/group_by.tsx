/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { useCallback } from 'react';
import { StaticIndexPatternField } from 'ui/index_patterns';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';

interface Props {
  intl: InjectedIntl;
  options: MetricsExplorerOptions;
  onChange: (groupBy: string | null) => void;
  fields: StaticIndexPatternField[];
}

export const MetricsExplorerGroupBy = injectI18n(({ intl, options, onChange, fields }: Props) => {
  const handleChange = useCallback(
    selectedOptions => {
      const groupBy = (selectedOptions.length === 1 && selectedOptions[0].label) || null;
      onChange(groupBy);
    },
    [onChange]
  );
  return (
    <EuiComboBox
      placeholder={intl.formatMessage({
        id: 'xpack.infra.metricsExplorer.groupByLabel',
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
});
