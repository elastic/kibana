/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  hasErrorsOrWarnings: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export function ExpandButton({ hasErrorsOrWarnings, isLoading, onClick }: Props) {
  // isLoading indicates at least one layer is loading.
  // Expand button should never be disabled.
  // Not using EuiButton* with iconType props because EuiButton* disables button when isLoading prop is true.
  return (
    <EuiButtonEmpty
      aria-label={i18n.translate('xpack.maps.layerControl.openLayerTOCButtonAriaLabel', {
        defaultMessage: 'Expand layers panel',
      })}
      className="mapLayerControl__openLayerTOCButton"
      color="text"
      onClick={onClick}
      data-test-subj="mapExpandLayerControlButton"
    >
      {isLoading ? (
        <div style={{ paddingTop: '6px' }}>
          <EuiLoadingSpinner />
        </div>
      ) : (
        <EuiIcon type={hasErrorsOrWarnings ? 'warning' : 'menuLeft'} />
      )}
    </EuiButtonEmpty>
  );
}
