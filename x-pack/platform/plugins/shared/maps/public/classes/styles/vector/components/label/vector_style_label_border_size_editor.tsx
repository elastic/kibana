/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React from 'react';

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { getVectorStyleLabel, getDisabledByMessage } from '../get_vector_style_label';
import { i18n } from '@kbn/i18n';
import { LABEL_BORDER_SIZES, VECTOR_STYLES } from '../../../../../../common/constants';
import { DisabledToolTip } from '../../disabled_tooltip';
import type { LabelBorderSizeOptions } from '../../../../../../common/descriptor_types';
import type { IStyleProperty } from '../../properties/style_property';

interface Props {
  disabled?: boolean;
  handlePropertyChange: (propertyName: VECTOR_STYLES, stylePropertyDescriptor: unknown) => void;
  styleProperty: IStyleProperty<LabelBorderSizeOptions>;
}

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

export function VectorStyleLabelBorderSizeEditor({
  disabled,
  handlePropertyChange,
  styleProperty,
}: Props) {
  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const styleDescriptor = {
      options: { size: e.target.value as LABEL_BORDER_SIZES },
    };
    handlePropertyChange(styleProperty.getStyleName(), styleDescriptor);
  }

  const labelBorderSizeForm = (
    <EuiFormRow label={getVectorStyleLabel(VECTOR_STYLES.LABEL_BORDER_SIZE)}>
      <EuiSelect
        disabled={disabled}
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

  if (!disabled) {
    return labelBorderSizeForm;
  }

  return (
    <DisabledToolTip content={getDisabledByMessage(VECTOR_STYLES.LABEL_TEXT)}>
      {labelBorderSizeForm}
    </DisabledToolTip>
  );
}
