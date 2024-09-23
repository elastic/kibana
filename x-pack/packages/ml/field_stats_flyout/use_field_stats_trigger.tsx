/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { Field } from '@kbn/ml-anomaly-utils';
import { optionCss } from './eui_combo_box_with_field_stats';
import { useFieldStatsFlyoutContext } from '.';
import type { FieldForStats } from './field_stats_info_button';
import { FieldStatsInfoButton } from './field_stats_info_button';

interface Option extends EuiComboBoxOptionOption<string> {
  field: Field;
}

/**
 * Custom hook for managing field statistics trigger functionality.
 *
 * @returns An object containing the following properties and functions:
 *   - `renderOption`: A callback function for rendering options in a combo box.
 *   - `setIsFlyoutVisible`: A function for setting the visibility of the flyout.
 *   - `setFieldName`: A function for setting the field name.
 *   - `handleFieldStatsButtonClick`: A callback function for handling field stats button click.
 *   - `closeFlyout`: A callback function for closing the flyout.
 *   - `optionCss`: CSS styles for the options in the combo box.
 *   - `populatedFields`: A set of populated fields.
 */
export const useFieldStatsTrigger = () => {
  const { setIsFlyoutVisible, setFieldName, populatedFields } = useFieldStatsFlyoutContext();

  const closeFlyout = useCallback(() => setIsFlyoutVisible(false), [setIsFlyoutVisible]);

  const handleFieldStatsButtonClick = useCallback(
    (field: FieldForStats) => {
      if (typeof field.id === 'string') {
        setFieldName(field.id);
        setIsFlyoutVisible(true);
      }
    },
    [setFieldName, setIsFlyoutVisible]
  );

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption, searchValue: string): ReactNode => {
      const field = (option as Option).field;
      return option.isGroupLabelOption || !field ? (
        option.label
      ) : (
        <FieldStatsInfoButton
          isEmpty={populatedFields && !populatedFields.has(field.id)}
          field={field}
          label={option.label}
          onButtonClick={handleFieldStatsButtonClick}
        />
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleFieldStatsButtonClick, populatedFields?.size]
  );
  return {
    renderOption,
    setIsFlyoutVisible,
    setFieldName,
    handleFieldStatsButtonClick,
    closeFlyout,
    optionCss,
    populatedFields,
  };
};
