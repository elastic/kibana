/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Fragment, ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { CustomIcon, IconDynamicOptions } from '../../../../../../common/descriptor_types';
import { FieldSelect } from '../field_select';
import { IconMapSelect, StyleOptionChanges } from './icon_map_select';
import { StyleField } from '../../style_fields_helper';
import { DynamicIconProperty } from '../../properties/dynamic_icon_property';

interface Props {
  customIcons: CustomIcon[];
  fields: StyleField[];
  onCustomIconsChange: (customIcons: CustomIcon[]) => void;
  onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: IconDynamicOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: DynamicIconProperty;
}

export function DynamicIconForm({
  fields,
  onDynamicStyleChange,
  onCustomIconsChange,
  customIcons,
  staticDynamicSelect,
  styleProperty,
}: Props) {
  const styleOptions = styleProperty.getOptions();

  const onFieldChange = ({ field }: { field: StyleField | null }) => {
    if (!field) {
      return;
    }
    const { name, origin } = field;
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      field: { name, origin },
    });
  };

  const onIconMapChange = (newOptions: StyleOptionChanges) => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      ...newOptions,
    });
  };

  function renderIconMapSelect() {
    const field = styleProperty.getField();
    if (!field) {
      return null;
    }

    return (
      <IconMapSelect
        {...styleOptions}
        styleProperty={styleProperty}
        customIcons={customIcons}
        onChange={onIconMapChange}
        onCustomIconsChange={onCustomIconsChange}
        isCustomOnly={!field.supportsFieldMetaFromLocalData() && !field.supportsFieldMetaFromEs()}
      />
    );
  }

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
        <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
          {staticDynamicSelect}
        </EuiFlexItem>
        <EuiFlexItem>
          <FieldSelect
            styleName={styleProperty.getStyleName()}
            fields={fields}
            selectedFieldName={_.get(styleOptions, 'field.name')}
            onChange={onFieldChange}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {renderIconMapSelect()}
    </Fragment>
  );
}
