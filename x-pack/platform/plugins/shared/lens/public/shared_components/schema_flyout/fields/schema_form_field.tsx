/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the "Elastic License
 * 2.0".
 */

import React from 'react';
import type { Control } from 'react-hook-form';
import type { FieldDescriptor } from '../types';
import { ToggleField } from './toggle_field';
import { SelectField } from './select_field';
import { NumberField } from './number_field';
import { TextField } from './text_field';
import { SectionField } from './section_field';
import { RangeField } from './range_field';
import { PaginationToggleField } from './pagination_toggle_field';
import { RowHeightField } from './row_height_field';

interface SchemaFormFieldProps {
  descriptor: FieldDescriptor;
  control: Control;
}

// Map custom widget names to base field types they should render as.
// Custom widgets that don't have dedicated renderers yet fall back to
// the closest generic renderer based on the schema type.
const widgetToBaseType: Record<string, string> = {
  buttonGroup: 'select',
};

export const SchemaFormField = ({ descriptor, control }: SchemaFormFieldProps) => {
  // Resolve: explicit widget → mapped base type → schema type
  const widget = descriptor.widget ?? descriptor.type;
  const resolved = widgetToBaseType[widget] ?? widget;

  switch (resolved) {
    case 'rowHeight':
      return <RowHeightField descriptor={descriptor} control={control} />;
    case 'paginationToggle':
      return <PaginationToggleField descriptor={descriptor} control={control} />;
    case 'range':
      return <RangeField descriptor={descriptor} control={control} />;
    case 'toggle':
      return <ToggleField descriptor={descriptor} control={control} />;
    case 'select':
      return <SelectField descriptor={descriptor} control={control} />;
    case 'number':
      return <NumberField descriptor={descriptor} control={control} />;
    case 'text':
      return <TextField descriptor={descriptor} control={control} />;
    case 'section':
      return <SectionField descriptor={descriptor} control={control} />;
    default:
      return null;
  }
};
