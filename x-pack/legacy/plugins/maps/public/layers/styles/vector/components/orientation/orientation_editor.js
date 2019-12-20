/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StaticDynamicStyleRow } from '../static_dynamic_style_row';
import { DynamicOrientationSelection } from './dynamic_orientation_selection';
import { StaticOrientationSelection } from './static_orientation_selection';

export function OrientationEditor(props) {
  return (
    <StaticDynamicStyleRow
      fields={props.fields}
      styleProperty={props.styleProperty}
      handlePropertyChange={props.handlePropertyChange}
      DynamicSelector={DynamicOrientationSelection}
      StaticSelector={StaticOrientationSelection}
      defaultDynamicStyleOptions={props.defaultDynamicStyleOptions}
      defaultStaticStyleOptions={props.defaultStaticStyleOptions}
    />
  );
}
