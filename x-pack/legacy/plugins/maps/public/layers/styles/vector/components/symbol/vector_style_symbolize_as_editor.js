/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFormRow, EuiButtonGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { SYMBOLIZE_AS_TYPES } from '../../../../../../common/constants';
import { VECTOR_STYLES } from '../../vector_style_defaults';

const SYMBOLIZE_AS_OPTIONS = [
  {
    id: SYMBOLIZE_AS_TYPES.CIRCLE,
    label: i18n.translate('xpack.maps.vector.symbolAs.circleLabel', {
      defaultMessage: 'marker',
    }),
  },
  {
    id: SYMBOLIZE_AS_TYPES.ICON,
    label: i18n.translate('xpack.maps.vector.symbolAs.IconLabel', {
      defaultMessage: 'icon',
    }),
  },
];

export function VectorStyleSymbolizeAsEditor({ styleProperty, handlePropertyChange }) {
  const styleOptions = styleProperty.getOptions();
  const selectedOption = SYMBOLIZE_AS_OPTIONS.find(({ id }) => {
    return id === styleOptions.value;
  });

  const onSymbolizeAsChange = optionId => {
    const styleDescriptor = {
      options: {
        value: optionId,
      },
    };
    handlePropertyChange(VECTOR_STYLES.SYMBOLIZE_AS, styleDescriptor);
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.vector.symbolLabel', {
        defaultMessage: 'Symbol type',
      })}
      display="columnCompressed"
    >
      <EuiButtonGroup
        buttonSize="compressed"
        options={SYMBOLIZE_AS_OPTIONS}
        idSelected={selectedOption ? selectedOption.id : undefined}
        onChange={onSymbolizeAsChange}
        isFullWidth
      />
    </EuiFormRow>
  );
}
