/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React from 'react';
import { EuiFormRow, EuiRange, EuiSwitch } from '@elastic/eui';
import { VECTOR_STYLES } from '../../vector_style_defaults';
import { i18n } from '@kbn/i18n';
import { FieldMetaPopover } from './field_meta_popover';

function getIsEnableToggleLabel(styleName) {
  switch (styleName) {
    case VECTOR_STYLES.FILL_COLOR:
    case VECTOR_STYLES.LINE_COLOR:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.colorLabel', {
        defaultMessage: 'Calculate color ramp range from indices',
      });
    case VECTOR_STYLES.LINE_WIDTH:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.widthLabel', {
        defaultMessage: 'Calculate border width range from indices',
      });
    case VECTOR_STYLES.ICON_SIZE:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.sizeLabel', {
        defaultMessage: 'Calculate symbol size range from indices',
      });
    default:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.defaultLabel', {
        defaultMessage: 'Calculate symbolization range from indices',
      });
  }
}

type Props = {
  styleProperty: unknown;
  onChange: (unknown) => void;
}

export function OrdinalFieldMetaPopover(props: Props) {

  const onIsEnabledChange = event => {
    props.onChange({
      ...props.styleProperty.getFieldMetaOptions(),
      isEnabled: event.target.checked,
    });
  };

  const onSigmaChange = event => {
    props.onChange({
      ...props.styleProperty.getFieldMetaOptions(),
      sigma: event.target.value,
    });
  };

  return (
    <FieldMetaPopover>
      <EuiFormRow display="columnCompressedSwitch">
        <EuiSwitch
          label={getIsEnableToggleLabel(props.styleProperty.getStyleName())}
          checked={props.styleProperty.getFieldMetaOptions().isEnabled}
          onChange={this._onIsEnabledChange}
          compressed
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.maps.styles.fieldMetaOptions.sigmaLabel', {
          defaultMessage: 'Sigma',
        })}
        display="columnCompressed"
      >
        <EuiRange
          min={1}
          max={5}
          step={0.25}
          value={props.styleProperty.getFieldMetaOptions().sigma}
          onChange={this._onSigmaChange}
          disabled={!props.styleProperty.getFieldMetaOptions().isEnabled}
          showTicks
          tickInterval={1}
          compressed
        />
      </EuiFormRow>
    </FieldMetaPopover>
  );
}
