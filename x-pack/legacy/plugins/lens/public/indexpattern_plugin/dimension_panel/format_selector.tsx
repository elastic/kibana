/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldNumber, EuiComboBox } from '@elastic/eui';
import { IndexPattern } from '../types';
import { IndexPatternColumn } from '../indexpattern';
import { IndexPatternDimensionPanelProps } from './dimension_panel';

const supportedFormats: Record<string, { title: string }> = {
  number: {
    title: i18n.translate('xpack.lens.indexPattern.numberFormatLabel', {
      defaultMessage: 'Number',
    }),
  },
  percent: {
    title: i18n.translate('xpack.lens.indexPattern.percentFormatLabel', {
      defaultMessage: 'Percent',
    }),
  },
  bytes: {
    title: i18n.translate('xpack.lens.indexPattern.bytesFormatLabel', {
      defaultMessage: 'Bytes (1024)',
    }),
  },
};

type FormatSelectorProps = Pick<IndexPatternDimensionPanelProps, 'data'> & {
  selectedColumn: IndexPatternColumn;
  currentIndexPattern: IndexPattern;
  onChange: (newFormat?: { id: string; params?: Record<string, unknown> }) => void;
};

export function FormatSelector(props: FormatSelectorProps) {
  const { selectedColumn, onChange } = props;

  const selectedFormat = selectedColumn.format?.id
    ? supportedFormats[selectedColumn.format.id]
    : undefined;

  const defaultOption = {
    value: '',
    label: i18n.translate('xpack.lens.indexPattern.defaultFormatLabel', {
      defaultMessage: 'Default',
    }),
  };

  const currentDecimals = selectedColumn.format?.params?.decimals;

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.lens.indexPattern.columnFormatLabel', {
          defaultMessage: 'Display format',
        })}
        display="rowCompressed"
      >
        <EuiComboBox
          fullWidth
          compressed
          isClearable={false}
          data-test-subj="indexPattern-dimension-format"
          singleSelection={{ asPlainText: true }}
          options={[defaultOption].concat(
            Object.entries(supportedFormats).map(([id, format]) => ({
              value: id || '',
              label: format.title || id || '',
            }))
          )}
          selectedOptions={
            selectedColumn.format
              ? [
                  {
                    value: selectedColumn.format.id || '',
                    label: selectedFormat?.title || selectedColumn.format.id || '',
                  },
                ]
              : [defaultOption]
          }
          onChange={choices => {
            if (choices.length === 0) {
              return;
            }

            if (!choices[0].value) {
              onChange();
              return;
            }
            onChange({
              id: choices[0].value,
              params: { decimals: typeof currentDecimals === 'number' ? currentDecimals : 3 },
            });
          }}
        />
      </EuiFormRow>

      {selectedColumn?.format ? (
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.decimalPlacesLabel', {
            defaultMessage: 'Decimals',
          })}
          display="rowCompressed"
        >
          <EuiFieldNumber
            data-test-subj="indexPattern-dimension-formatDecimals"
            value={typeof currentDecimals === 'number' ? currentDecimals : 3}
            min={0}
            max={20}
            onChange={e => {
              onChange({
                id: selectedColumn.format!.id,
                params: {
                  decimals: Number(e.target.value),
                },
              });
            }}
            compressed
            fullWidth
          />
        </EuiFormRow>
      ) : null}
    </>
  );
}
