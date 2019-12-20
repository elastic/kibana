/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StaticDynamicStyleRow } from '../static_dynamic_style_row';
import { DynamicLabelSelector } from './dynamic_label_selector';
import { StaticLabelSelector } from './static_label_selector';

export function VectorStyleLabelEditor(props) {
  return (
    <StaticDynamicStyleRow
      {...props}
      DynamicSelector={DynamicLabelSelector}
      StaticSelector={StaticLabelSelector}
    />
  );
}
