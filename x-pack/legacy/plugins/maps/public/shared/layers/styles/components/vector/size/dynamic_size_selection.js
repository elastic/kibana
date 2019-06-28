/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { dynamicSizeShape } from '../style_option_shapes';
import { FieldSelect, fieldShape } from '../field_select';
import { SizeRangeSelector } from './size_range_selector';
import { EuiSpacer } from '@elastic/eui';

export function DynamicSizeSelection({ ordinalFields, styleOptions, onChange }) {
  const onFieldChange = ({ field }) => {
    onChange({ ...styleOptions, field });
  };

  const onSizeRangeChange = ({ minSize, maxSize }) => {
    onChange({ ...styleOptions, minSize, maxSize });
  };

  return (
    <Fragment>
      <SizeRangeSelector
        onChange={onSizeRangeChange}
        minSize={styleOptions.minSize}
        maxSize={styleOptions.maxSize}
      />
      <EuiSpacer size="s" />
      <FieldSelect
        fields={ordinalFields}
        selectedField={_.get(styleOptions, 'field')}
        onChange={onFieldChange}
      />
    </Fragment>
  );
}

DynamicSizeSelection.propTypes = {
  ordinalFields: PropTypes.arrayOf(fieldShape).isRequired,
  styleOptions: dynamicSizeShape.isRequired,
  onChange: PropTypes.func.isRequired
};
