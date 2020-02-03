/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StylePropEditor } from '../style_prop_editor';
import { DynamicSizeForm } from './dynamic_size_form';
import { StaticSizeForm } from './static_size_form';

export function VectorStyleSizeEditor(props) {
  const sizeForm = props.styleProperty.isDynamic() ? (
    <DynamicSizeForm {...props} />
  ) : (
    <StaticSizeForm {...props} />
  );

  return <StylePropEditor {...props}>{sizeForm}</StylePropEditor>;
}
