/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RENDER_AS } from '../../../../common/constants';

const options = [
  {
    label: i18n.translate('xpack.maps.source.esGeoGrid.pointsDropdownOption', {
      defaultMessage: 'clusters',
    }),
    value: RENDER_AS.POINT,
  },
  {
    label: i18n.translate('xpack.maps.source.esGeoGrid.gridRectangleDropdownOption', {
      defaultMessage: 'grids',
    }),
    value: RENDER_AS.GRID,
  },
];

export function RenderAsSelect(props: {
  renderAs: RENDER_AS;
  onChange: (newValue: RENDER_AS) => void;
}) {
  function onChange(selectedOptions) {
    if (!selectedOptions || !selectedOptions.length) {
      return;
    }
    props.onChange(selectedOptions[0].value);
  }

  const selectedOptions = [];
  const selectedOption = options.find(option => option.value === props.renderAs);
  if (selectedOption) {
    selectedOptions.push(selectedOption);
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.source.esGeoGrid.showAsLabel', {
        defaultMessage: 'Show as',
      })}
    >
      <EuiComboBox
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChange}
        isClearable={false}
      />
    </EuiFormRow>
  );
}
