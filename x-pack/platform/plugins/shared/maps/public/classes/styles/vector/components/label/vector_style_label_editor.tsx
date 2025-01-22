/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Props } from '../style_prop_editor';
import { StylePropEditor } from '../style_prop_editor';
import { DynamicLabelForm } from './dynamic_label_form';
import { StaticLabelForm } from './static_label_form';
import type {
  LabelDynamicOptions,
  LabelStaticOptions,
} from '../../../../../../common/descriptor_types';
import type { DynamicTextProperty } from '../../properties/dynamic_text_property';
import type { StaticTextProperty } from '../../properties/static_text_property';

type LabelEditorProps = Omit<Props<LabelStaticOptions, LabelDynamicOptions>, 'children'>;

export function VectorStyleLabelEditor(props: LabelEditorProps) {
  const labelForm = props.styleProperty.isDynamic() ? (
    <DynamicLabelForm {...props} styleProperty={props.styleProperty as DynamicTextProperty} />
  ) : (
    <StaticLabelForm {...props} styleProperty={props.styleProperty as StaticTextProperty} />
  );

  return <StylePropEditor {...props}>{labelForm}</StylePropEditor>;
}
