/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFormRow, EuiButtonGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { SYMBOLIZE_AS_TYPES, VECTOR_STYLES } from '../../../../../../common/constants';
import { getDisabledByMessage } from '../get_vector_style_label';
import { DisabledToolTip } from '../../disabled_tooltip';
import type { SymbolizeAsOptions } from '../../../../../../common/descriptor_types';
import type { IStyleProperty } from '../../properties/style_property';

interface Props {
  disabled?: boolean;
  disabledBy?: VECTOR_STYLES;
  styleProperty: IStyleProperty<SymbolizeAsOptions>;
  handlePropertyChange: (propertyName: VECTOR_STYLES, stylePropertyDescriptor: unknown) => void;
}

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

export function VectorStyleSymbolizeAsEditor({
  disabled,
  disabledBy,
  styleProperty,
  handlePropertyChange,
}: Props) {
  const styleOptions = styleProperty.getOptions();
  const selectedOption = SYMBOLIZE_AS_OPTIONS.find(({ id }) => {
    return id === styleOptions.value;
  });

  const onSymbolizeAsChange = (optionId: string) => {
    const styleDescriptor = {
      options: {
        value: optionId as SYMBOLIZE_AS_TYPES,
      },
    };
    handlePropertyChange(VECTOR_STYLES.SYMBOLIZE_AS, styleDescriptor);
  };

  const symbolLabel = i18n.translate('xpack.maps.vector.symbolLabel', {
    defaultMessage: 'Symbol type',
  });
  const symbolizeAsForm = (
    <EuiFormRow label={symbolLabel} display="columnCompressed">
      <EuiButtonGroup
        type="single"
        isDisabled={disabled}
        buttonSize="compressed"
        options={SYMBOLIZE_AS_OPTIONS}
        idSelected={selectedOption ? selectedOption.id : ''}
        onChange={onSymbolizeAsChange}
        isFullWidth
        legend={symbolLabel}
      />
    </EuiFormRow>
  );

  if (!disabled) {
    return symbolizeAsForm;
  }

  return (
    <DisabledToolTip content={getDisabledByMessage(disabledBy!)}>{symbolizeAsForm}</DisabledToolTip>
  );
}
