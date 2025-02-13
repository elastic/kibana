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
  applyForceRefresh: boolean;
  setApplyForceRefresh: (applyGlobalTime: boolean) => void;
}

export function ForceRefreshCheckbox({ applyForceRefresh, setApplyForceRefresh }: Props) {
  const onChange = (event: EuiSwitchEvent) => {
    setApplyForceRefresh(event.target.checked);
  };

  return (
    <EuiFormRow display="columnCompressed">
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.maps.filterEditor.applyForceRefreshTooltip', {
          defaultMessage: `When on, layer re-fetches data when automatic refresh fires and when "Refresh" is clicked.`,
        })}
      >
        <EuiSwitch
          label={i18n.translate('xpack.maps.filterEditor.applyForceRefreshLabel', {
            defaultMessage: `Re-fetch layer data on refresh`,
          })}
          checked={applyForceRefresh}
          onChange={onChange}
          data-test-subj="mapLayerPanelRespondToForceRefreshCheckbox"
          compressed
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
