/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StaticDynamicStyleRow } from '../static_dynamic_style_row';
import { DynamicColorSelection } from './dynamic_color_selection';
import { StaticColorSelection } from './static_color_selection';

export function VectorStyleColorEditor(props) {
  return (
    <StaticDynamicStyleRow
      ordinalFields={props.ordinalFields}
      styleProperty={props.styleProperty}
      handlePropertyChange={props.handlePropertyChange}
      swatches={props.swatches}
      DynamicSelector={DynamicColorSelection}
      StaticSelector={StaticColorSelection}
      defaultDynamicStyleOptions={props.defaultDynamicStyleOptions}
      defaultStaticStyleOptions={props.defaultStaticStyleOptions}
    />
  );
}
