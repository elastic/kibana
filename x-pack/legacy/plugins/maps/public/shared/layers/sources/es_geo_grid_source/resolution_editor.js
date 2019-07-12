/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { GRID_RESOLUTION } from '../../grid_resolution';
import {
  EuiSuperSelect,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const OPTIONS = [
  {
    value: GRID_RESOLUTION.COARSE,
    inputDisplay: i18n.translate('xpack.maps.source.esGrid.coarseDropdownOption', {
      defaultMessage: 'coarse'
    })
  },
  { value: GRID_RESOLUTION.FINE,
    inputDisplay: i18n.translate('xpack.maps.source.esGrid.fineDropdownOption', {
      defaultMessage: 'fine'
    })

  },
  {
    value: GRID_RESOLUTION.MOST_FINE,
    inputDisplay: i18n.translate('xpack.maps.source.esGrid.finestDropdownOption', {
      defaultMessage: 'finest'
    })
  }
];

export function ResolutionEditor({ resolution, onChange }) {
  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.geoGrid.resolutionLabel', {
        defaultMessage: 'Grid resolution'
      })}
    >
      <EuiSuperSelect options={OPTIONS} valueOfSelected={resolution} onChange={onChange} />
    </EuiFormRow>
  );
}
