/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, type EuiSpacerProps } from '@elastic/eui';
import type { Control } from 'react-hook-form';

import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import { DatasetSettingsField } from './dataset_settings_field';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';

export const datasetSettingsFieldsWidthCss = css`
  width: 80%;
`;

const chunkFields = <T,>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export interface DatasetSettingsFieldsLayoutProps {
  control: Control<CreateDatasetFormValues>;
  fields: readonly DatasetSettingsFieldId[];
  testSubjPrefix: string;
  columns?: number;
  rowSpacerSize?: EuiSpacerProps['size'];
  constrainWidth?: boolean;
}

export const DatasetSettingsFieldsLayout: FunctionComponent<DatasetSettingsFieldsLayoutProps> = ({
  control,
  fields,
  testSubjPrefix,
  columns = 3,
  rowSpacerSize = 'l',
  constrainWidth = true,
}) => {
  if (fields.length === 0) {
    return null;
  }

  const rows = chunkFields(fields, columns);

  return (
    <div css={constrainWidth ? datasetSettingsFieldsWidthCss : undefined}>
      {rows.map((rowFields, rowIndex) => (
        <React.Fragment key={rowFields.join('-') || `empty-row-${rowIndex}`}>
          {rowIndex > 0 ? <EuiSpacer size={rowSpacerSize} /> : null}
          <EuiFlexGroup>
            {Array.from({ length: columns }, (_, columnIndex) => {
              const fieldId = rowFields[columnIndex];

              return (
                <EuiFlexItem key={fieldId ?? `empty-column-${rowIndex}-${columnIndex}`}>
                  {fieldId ? (
                    <DatasetSettingsField
                      control={control}
                      fieldId={fieldId}
                      testSubjPrefix={testSubjPrefix}
                    />
                  ) : null}
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </React.Fragment>
      ))}
    </div>
  );
};
