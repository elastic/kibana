/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { GRID_RESOLUTION } from '../../grid_resolution';
import {
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';


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
    <Fragment>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={true}>
          <EuiFormLabel style={{ marginBottom: 0 }}>
            <FormattedMessage
              id="xpack.maps.geoGrid.resolutionLabel"
              defaultMessage="Grid resolution"
            />
          </EuiFormLabel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={true}>
          <EuiSuperSelect options={OPTIONS} valueOfSelected={resolution} onChange={onChange} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
}
