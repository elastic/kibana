/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StaticDynamicStyleRow } from '../../static_dynamic_style_row';
import { DynamicOrientationSelection } from './dynamic_orientation_selection';
import { StaticOrientationSelection } from './static_orientation_selection';
import { i18n } from '@kbn/i18n';

export function OrientationEditor(props) {
  return (
    <StaticDynamicStyleRow
      ordinalFields={props.ordinalFields}
      property={props.styleProperty}
      label={i18n.translate('xpack.maps.styles.vector.orientationLabel', {
        defaultMessage: 'Symbol orientation',
      })}
      styleDescriptor={props.styleDescriptor}
      handlePropertyChange={props.handlePropertyChange}
      DynamicSelector={DynamicOrientationSelection}
      StaticSelector={StaticOrientationSelection}
      defaultDynamicStyleOptions={props.defaultDynamicStyleOptions}
      defaultStaticStyleOptions={props.defaultStaticStyleOptions}
    />
  );
}
