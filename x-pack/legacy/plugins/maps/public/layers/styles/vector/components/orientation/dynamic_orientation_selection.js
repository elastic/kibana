/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { dynamicOrientationShape } from '../style_option_shapes';
import { FieldSelect, fieldShape } from '../field_select';

export function DynamicOrientationSelection({ ordinalFields, styleOptions, onChange }) {
  const onFieldChange = ({ field }) => {
    onChange({ ...styleOptions, field });
  };

  return (
    <FieldSelect
      fields={ordinalFields}
      selectedFieldName={_.get(styleOptions, 'field.name')}
      onChange={onFieldChange}
      compressed
    />
  );
}

DynamicOrientationSelection.propTypes = {
  ordinalFields: PropTypes.arrayOf(fieldShape).isRequired,
  styleOptions: dynamicOrientationShape.isRequired,
  onChange: PropTypes.func.isRequired,
};
