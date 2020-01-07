/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { LABEL_BORDER_SIZES, VECTOR_STYLES } from '../../vector_style_defaults';
import { getVectorStyleLabel } from '../get_vector_style_label';
import { i18n } from '@kbn/i18n';

const options = [
  {
    value: LABEL_BORDER_SIZES.NONE,
    text: i18n.translate('xpack.maps.styles.labelBorderSize.noneLabel', {
      defaultMessage: 'None',
    }),
  },
  {
    value: LABEL_BORDER_SIZES.SMALL,
    text: i18n.translate('xpack.maps.styles.labelBorderSize.smallLabel', {
      defaultMessage: 'Small',
    }),
  },
  {
    value: LABEL_BORDER_SIZES.MEDIUM,
    text: i18n.translate('xpack.maps.styles.labelBorderSize.mediumLabel', {
      defaultMessage: 'Medium',
    }),
  },
  {
    value: LABEL_BORDER_SIZES.LARGE,
    text: i18n.translate('xpack.maps.styles.labelBorderSize.largeLabel', {
      defaultMessage: 'Large',
    }),
  },
];

export function VectorStyleLabelHaloSizeEditor({ handlePropertyChange, styleProperty }) {
  function onChange(e) {
    handlePropertyChange(styleProperty.getStyleName(), { size: e.target.value });
  }

  return (
    <EuiFormRow
      label={getVectorStyleLabel(VECTOR_STYLES.LABEL_BORDER_SIZE)}
      display="columnCompressed"
    >
      <EuiSelect
        options={options}
        value={styleProperty.getOptions().size}
        onChange={onChange}
        aria-label={i18n.translate('xpack.maps.styles.labelBorderSizeSelect.ariaLabel', {
          defaultMessage: 'Select label border size',
        })}
        compressed
      />
    </EuiFormRow>
  );
}
