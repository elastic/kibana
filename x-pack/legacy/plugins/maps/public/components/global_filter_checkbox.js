/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const label = i18n.translate('xpack.maps.layerPanel.applyGlobalQueryCheckboxLabel', {
  defaultMessage: `Apply global filter to source`,
});

export function GlobalFilterCheckbox({ applyGlobalQuery, customLabel, setApplyGlobalQuery }) {
  const onApplyGlobalQueryChange = event => {
    setApplyGlobalQuery(event.target.checked);
  };

  return (
    <EuiFormRow
      display="columnCompressedSwitch"
    >
      <EuiSwitch
        label={customLabel ? customLabel : label}
        checked={applyGlobalQuery}
        onChange={onApplyGlobalQueryChange}
        data-test-subj="mapLayerPanelApplyGlobalQueryCheckbox"
        compressed
      />
    </EuiFormRow>
  );
}
