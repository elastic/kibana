/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { datasetWizardStrings } from './dataset_wizard_i18n';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import { FieldTypeSuperSelect } from './field_type_super_select';
import {
  applyAutomaticFieldTypeOverride,
  getEffectiveAutomaticFieldType,
  isAutomaticFieldTypeOverridden,
  pruneAutomaticFieldTypeOverrides,
} from './inferred_field_type_options';
import type { TestConfigurationPreviewField } from './test_configuration_preview_utils';

const VISIBLE_SCHEMA_ROWS = 10;

export interface InferredSchemaPreviewRow {
  id: string;
  name: string;
  inferredType: string;
  type: string;
}

export interface InferredSchemaPreviewTableProps {
  control: Control<DatasetWizardFormValues>;
  inferredFields: TestConfigurationPreviewField[];
  testSubjPrefix: string;
}

export const InferredSchemaPreviewTable: FunctionComponent<InferredSchemaPreviewTableProps> = ({
  control,
  inferredFields,
  testSubjPrefix,
}) => {
  const { euiTheme } = useEuiTheme();
  const resetButtonSlotWidth = euiTheme.size.xl;

  const tableScrollContainerStyles = useMemo(
    () => css`
      max-height: calc(${euiTheme.size.l} + (${VISIBLE_SCHEMA_ROWS} * ${euiTheme.size.xxxl}));
      overflow: auto;
    `,
    [euiTheme.size.l, euiTheme.size.xxxl]
  );

  const typeSelectRowStyles = useMemo(
    () => css`
      width: 100%;

      .euiSuperSelect {
        width: 100%;
      }
    `,
    []
  );

  const { field: automaticFieldTypesField } = useController({
    control,
    name: 'automatic_field_types',
  });

  const automaticFieldTypes = automaticFieldTypesField.value ?? {};

  useEffect(() => {
    const prunedOverrides = pruneAutomaticFieldTypeOverrides(
      automaticFieldTypes,
      inferredFields.map((field) => field.name)
    );

    if (Object.keys(prunedOverrides).length !== Object.keys(automaticFieldTypes).length) {
      automaticFieldTypesField.onChange(prunedOverrides);
    }
  }, [automaticFieldTypes, automaticFieldTypesField, inferredFields]);

  const items = useMemo<InferredSchemaPreviewRow[]>(
    () =>
      inferredFields.map((field) => {
        const inferredType = field.type ?? 'keyword';

        return {
          id: field.name,
          name: field.name,
          inferredType,
          type: getEffectiveAutomaticFieldType({
            fieldName: field.name,
            inferredType,
            overrides: automaticFieldTypes,
          }),
        };
      }),
    [automaticFieldTypes, inferredFields]
  );

  const handleTypeChange = useCallback(
    (fieldName: string, inferredType: string, nextType: string) => {
      automaticFieldTypesField.onChange(
        applyAutomaticFieldTypeOverride({
          overrides: automaticFieldTypes,
          fieldName,
          inferredType,
          nextType,
        })
      );
    },
    [automaticFieldTypes, automaticFieldTypesField]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<InferredSchemaPreviewRow>>>(
    () => [
      {
        field: 'name',
        name: datasetWizardStrings.automaticSchemaSampleFieldColumn(),
        sortable: true,
        truncateText: true,
        width: '50%',
        'data-test-subj': `${testSubjPrefix}FieldColumn`,
      },
      {
        field: 'type',
        name: datasetWizardStrings.automaticSchemaSampleTypeColumn(),
        width: '50%',
        render: (_type: string, item: InferredSchemaPreviewRow) => {
          const isOverridden = isAutomaticFieldTypeOverridden(automaticFieldTypes, item.name);

          return (
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              css={typeSelectRowStyles}
            >
              <EuiFlexItem
                grow
                css={css`
                  min-width: 0;
                `}
              >
                <FieldTypeSuperSelect
                  fullWidth
                  inferredType={item.inferredType}
                  valueOfSelected={item.type}
                  onChange={(nextType) =>
                    handleTypeChange(item.name, item.inferredType, nextType)
                  }
                  aria-label={datasetWizardStrings.automaticSchemaSampleTypeSelectAriaLabel(
                    item.name
                  )}
                  data-test-subj={`${testSubjPrefix}TypeSelect-${item.name}`}
                />
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                css={css`
                  flex: 0 0 ${resetButtonSlotWidth};
                  width: ${resetButtonSlotWidth};
                `}
              >
                {isOverridden ? (
                  <EuiToolTip
                    content={datasetWizardStrings.automaticSchemaSampleResetTypeTooltip(
                      item.inferredType
                    )}
                  >
                    <EuiButtonIcon
                      iconType="refresh"
                      size="s"
                      aria-label={datasetWizardStrings.automaticSchemaSampleResetTypeAriaLabel(
                        item.name
                      )}
                      data-test-subj={`${testSubjPrefix}ResetTypeButton-${item.name}`}
                      onClick={() =>
                        handleTypeChange(item.name, item.inferredType, item.inferredType)
                      }
                    />
                  </EuiToolTip>
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
        'data-test-subj': `${testSubjPrefix}TypeColumn`,
      },
    ],
    [automaticFieldTypes, handleTypeChange, resetButtonSlotWidth, testSubjPrefix, typeSelectRowStyles]
  );

  return (
    <div css={tableScrollContainerStyles} data-test-subj={`${testSubjPrefix}TableScroll`}>
      <EuiInMemoryTable<InferredSchemaPreviewRow>
        items={items}
        itemId="id"
        columns={columns}
        pagination={false}
        sorting={{ sort: { field: 'name', direction: 'asc' } }}
        tableLayout="fixed"
        responsiveBreakpoint={false}
        data-test-subj={`${testSubjPrefix}Table`}
        tableCaption={datasetWizardStrings.automaticSchemaSampleTableCaption()}
      />
    </div>
  );
};
