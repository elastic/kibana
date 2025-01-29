/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Props, StylePropEditor } from '../style_prop_editor';
import { DynamicIconForm } from './dynamic_icon_form';
import { StaticIconForm } from './static_icon_form';
import {
  CustomIcon,
  IconDynamicOptions,
  IconStaticOptions,
} from '../../../../../../common/descriptor_types';
import { DynamicIconProperty } from '../../properties/dynamic_icon_property';
import { StaticIconProperty } from '../../properties/static_icon_property';

type IconEditorProps = Omit<Props<IconStaticOptions, IconDynamicOptions>, 'children'>;

export function VectorStyleIconEditor(
  props: IconEditorProps & {
    customIcons: CustomIcon[];
    onCustomIconsChange: (customIcons: CustomIcon[]) => void;
  }
) {
  const iconForm = props.styleProperty.isDynamic() ? (
    <DynamicIconForm {...props} styleProperty={props.styleProperty as DynamicIconProperty} />
  ) : (
    <StaticIconForm {...props} styleProperty={props.styleProperty as StaticIconProperty} />
  );

  return <StylePropEditor {...props}>{iconForm}</StylePropEditor>;
}
