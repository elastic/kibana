/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { dynamicColorShape } from '../style_option_shapes';
import { FieldSelect, fieldShape } from '../field_select';
import { ColorRampSelect } from './color_ramp_select';
import { EuiSpacer } from '@elastic/eui';

export function DynamicColorSelection({ ordinalFields, onChange, styleOptions }) {
  const onFieldChange = ({ field }) => {
    onChange({ ...styleOptions, field });
  };

  const onColorChange = colorOptions => {
    onChange({ ...styleOptions, ...colorOptions });
  };

  return (
    <Fragment>
      <ColorRampSelect
        onChange={onColorChange}
        color={styleOptions.color}
        customColorRamp={styleOptions.customColorRamp}
        useCustomColorRamp={_.get(styleOptions, 'useCustomColorRamp', false)}
        compressed
      />
      <EuiSpacer size="s" />
      <FieldSelect
        fields={ordinalFields}
        selectedFieldName={_.get(styleOptions, 'field.name')}
        onChange={onFieldChange}
        compressed
      />
    </Fragment>
  );
}

DynamicColorSelection.propTypes = {
  ordinalFields: PropTypes.arrayOf(fieldShape).isRequired,
  styleOptions: dynamicColorShape.isRequired,
  onChange: PropTypes.func.isRequired,
};
