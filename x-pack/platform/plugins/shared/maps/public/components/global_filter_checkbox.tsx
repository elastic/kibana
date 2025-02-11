/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  applyGlobalQuery: boolean;
  label: string;
  setApplyGlobalQuery: (applyGlobalQuery: boolean) => void;
  isFeatureEditorOpenForLayer?: boolean;
}

export function GlobalFilterCheckbox({
  applyGlobalQuery,
  label,
  setApplyGlobalQuery,
  isFeatureEditorOpenForLayer,
}: Props) {
  const onApplyGlobalQueryChange = (event: EuiSwitchEvent) => {
    setApplyGlobalQuery(event.target.checked);
  };

  const tooltipMessage = isFeatureEditorOpenForLayer
    ? i18n.translate('xpack.maps.filterEditor.isGlobalSearchNotApplied', {
        defaultMessage: 'Global search is not applied to the layer while editing features',
      })
    : i18n.translate('xpack.maps.filterEditor.applyGlobalFilterHelp', {
        defaultMessage: 'When enabled, results narrowed by global search',
      });

  return (
    <EuiFormRow display="columnCompressed">
      <EuiToolTip position="top" content={tooltipMessage}>
        <EuiSwitch
          label={label}
          checked={isFeatureEditorOpenForLayer ? false : applyGlobalQuery}
          onChange={onApplyGlobalQueryChange}
          data-test-subj="mapLayerPanelApplyGlobalQueryCheckbox"
          compressed
          disabled={isFeatureEditorOpenForLayer}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
