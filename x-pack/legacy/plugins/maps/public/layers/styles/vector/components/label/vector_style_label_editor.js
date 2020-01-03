/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StylePropEditor } from '../style_prop_editor';
import { DynamicLabelEditor } from './dynamic_label_editor';
import { StaticLabelEditor } from './static_label_editor';

export function VectorStyleLabelEditor(props) {
  const labelEditor = props.styleProperty.isDynamic() ? (
    <DynamicLabelEditor {...props} />
  ) : (
    <StaticLabelEditor {...props} />
  );

  return <StylePropEditor {...props}>{labelEditor}</StylePropEditor>;
}
