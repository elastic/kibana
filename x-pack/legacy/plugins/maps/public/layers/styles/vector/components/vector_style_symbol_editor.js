/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButtonGroup,
  EuiSpacer,
  EuiComboBox,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { SYMBOLIZE_AS_CIRCLE, SYMBOLIZE_AS_ICON } from '../vector_constants';
import { SymbolIcon } from './legend/symbol_icon';

const SYMBOLIZE_AS_OPTIONS = [
  {
    id: SYMBOLIZE_AS_CIRCLE,
    label: i18n.translate('xpack.maps.vector.symbolAs.circleLabel', {
      defaultMessage: 'circle marker',
    }),
  },
  {
    id: SYMBOLIZE_AS_ICON,
    label: i18n.translate('xpack.maps.vector.symbolAs.IconLabel', {
      defaultMessage: 'icon',
    }),
  },
];

export function VectorStyleSymbolEditor({
  styleOptions,
  handlePropertyChange,
  symbolOptions,
  isDarkMode,
}) {
  const renderSymbolizeAsSelect = () => {
    const selectedOption = SYMBOLIZE_AS_OPTIONS.find(({ id }) => {
      return id === styleOptions.symbolizeAs;
    });

    const onSymbolizeAsChange = optionId => {
      const styleDescriptor = {
        options: {
          ...styleOptions,
          symbolizeAs: optionId,
        },
      };
      handlePropertyChange('symbol', styleDescriptor);
    };

    return (
      <EuiButtonGroup
        buttonSize="compressed"
        options={SYMBOLIZE_AS_OPTIONS}
        idSelected={selectedOption ? selectedOption.id : undefined}
        onChange={onSymbolizeAsChange}
        isFullWidth
      />
    );
  };

  const renderSymbolSelect = () => {
    const selectedOption = symbolOptions.find(({ value }) => {
      return value === styleOptions.symbolId;
    });

    const onSymbolChange = selectedOptions => {
      if (!selectedOptions || selectedOptions.length === 0) {
        return;
      }

      const styleDescriptor = {
        options: {
          ...styleOptions,
          symbolId: selectedOptions[0].value,
        },
      };
      handlePropertyChange('symbol', styleDescriptor);
    };

    const renderOption = ({ value, label }) => {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false} style={{ width: '15px' }}>
            <SymbolIcon
              symbolId={value}
              fill={isDarkMode ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
              stroke={isDarkMode ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'}
              strokeWidth={'1px'}
            />
          </EuiFlexItem>
          <EuiFlexItem>{label}</EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    return (
      <EuiComboBox
        options={symbolOptions}
        onChange={onSymbolChange}
        selectedOptions={selectedOption ? [selectedOption] : undefined}
        singleSelection={true}
        isClearable={false}
        renderOption={renderOption}
        compressed
      />
    );
  };

  return (
    <Fragment>
      <EuiFormRow
        label={i18n.translate('xpack.maps.vector.symbolLabel', {
          defaultMessage: 'Symbol type',
        })}
        display="columnCompressed"
      >
        {renderSymbolizeAsSelect()}
      </EuiFormRow>

      {styleOptions.symbolizeAs !== SYMBOLIZE_AS_CIRCLE && (
        <Fragment>
          <EuiSpacer size="s" />
          {renderSymbolSelect()}
        </Fragment>
      )}
    </Fragment>
  );
}
