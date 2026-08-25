/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function IgnoreGlobalFilterRowControl({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (newValue: boolean) => void;
}) {
  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.layerSettings.ignoreGlobalFilters', {
        defaultMessage: 'Use global filters',
      })}
    >
      <EuiSwitch
        label={i18n.translate('xpack.lens.layerSettings.ignoreGlobalFilters', {
          defaultMessage: 'Use global filters',
        })}
        showLabel={false}
        checked={checked}
        data-test-subj="lns-layerSettings-ignoreGlobalFilters"
        onChange={() => onChange(!checked)}
        compressed
      />
    </EuiFormRow>
  );
}
