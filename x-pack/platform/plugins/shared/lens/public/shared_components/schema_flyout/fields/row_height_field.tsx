/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { RowHeightSettings } from '@kbn/unified-data-table';
import type { RowHeightModeType } from '@kbn/unified-data-table';
import type { FieldDescriptor } from '../types';

interface RowHeightFieldProps {
  descriptor: FieldDescriptor;
  control: Control;
}

export const RowHeightField = ({ descriptor, control }: RowHeightFieldProps) => {
  const maxRowHeight = (descriptor.props?.maxLines as number) ?? 20;

  const { field: typeField } = useController({
    name: `${descriptor.path}.type`,
    control,
    defaultValue: 'auto',
  });

  const { field: linesField } = useController({
    name: `${descriptor.path}.lines`,
    control,
    defaultValue: 2,
  });

  const onChangeRowHeight = (mode: RowHeightModeType | undefined) => {
    typeField.onChange(mode ?? 'auto');
  };

  const onChangeLineCountInput = (lines: number) => {
    linesField.onChange(lines);
  };

  return (
    <RowHeightSettings
      rowHeight={(typeField.value as RowHeightModeType) ?? 'auto'}
      lineCountInput={linesField.value as number}
      maxRowHeight={maxRowHeight}
      label={descriptor.label}
      onChangeRowHeight={onChangeRowHeight}
      onChangeLineCountInput={onChangeLineCountInput}
      fullWidth
      data-test-subj={`schemaRowHeight-${descriptor.path}`}
    />
  );
};
