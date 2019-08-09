/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StaticDynamicStyleRow } from '../../static_dynamic_style_row';
import  { DynamicSizeSelection } from './dynamic_size_selection';
import  { StaticSizeSelection } from './static_size_selection';
import { getVectorStyleLabel } from '../get_vector_style_label';

export function VectorStyleSizeEditor(props) {
  return (
    <StaticDynamicStyleRow
      ordinalFields={props.ordinalFields}
      property={props.styleProperty}
      label={getVectorStyleLabel(props.styleProperty)}
      styleDescriptor={props.styleDescriptor}
      handlePropertyChange={props.handlePropertyChange}
      DynamicSelector={DynamicSizeSelection}
      StaticSelector={StaticSizeSelection}
      defaultDynamicStyleOptions={props.defaultDynamicStyleOptions}
      defaultStaticStyleOptions={props.defaultStaticStyleOptions}
    />
  );
}
