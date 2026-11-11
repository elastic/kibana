/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Props } from '../style_prop_editor';
import { StylePropEditor } from '../style_prop_editor';
import { DynamicOrientationForm } from './dynamic_orientation_form';
import { StaticOrientationForm } from './static_orientation_form';
import type {
  OrientationDynamicOptions,
  OrientationStaticOptions,
} from '../../../../../../common/descriptor_types';
import type { DynamicOrientationProperty } from '../../properties/dynamic_orientation_property';
import type { StaticOrientationProperty } from '../../properties/static_orientation_property';

type OrientationEditorProps = Omit<
  Props<OrientationStaticOptions, OrientationDynamicOptions>,
  'children'
>;

export function OrientationEditor(props: OrientationEditorProps) {
  const orientationForm = props.styleProperty.isDynamic() ? (
    <DynamicOrientationForm
      {...props}
      styleProperty={props.styleProperty as DynamicOrientationProperty}
    />
  ) : (
    <StaticOrientationForm
      {...props}
      styleProperty={props.styleProperty as StaticOrientationProperty}
    />
  );

  return <StylePropEditor {...props}>{orientationForm}</StylePropEditor>;
}
