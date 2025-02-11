/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback } from 'react';
import { type EuiComboBoxOptionOption } from '@elastic/eui';
import type { Field } from '@kbn/ml-anomaly-utils';
import { css } from '@emotion/react';
import { EVENT_RATE_FIELD_ID } from '@kbn/ml-anomaly-utils/fields';
import type { DropDownLabel } from '.';
import { useFieldStatsFlyoutContext } from '.';
import type { FieldForStats } from './field_stats_info_button';
import { FieldStatsInfoButton } from './field_stats_info_button';
import { isSelectableOption } from './options_list_with_stats/types';

export const optionCss = css`
  .euiComboBoxOption__enterBadge {
    display: none;
  }
  .euiFlexGroup {
    gap: 0px;
  }
  .euiComboBoxOption__content {
    margin-left: 2px;
  }
`;
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
export function useFieldStatsTrigger<T = DropDownLabel>() {
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
    (option: T): ReactNode => {
      if (isSelectableOption(option)) {
        const field = (option as Option).field;
        const isInternalEventRateFieldId = field?.id === EVENT_RATE_FIELD_ID;
        const isEmpty = isInternalEventRateFieldId
          ? false
          : !populatedFields?.has(field?.id ?? field?.name);
        const shouldHideInpectButton = option.hideTrigger ?? option['data-hide-inspect'];
        return option.isGroupLabel || !field ? (
          option.label
        ) : (
          <FieldStatsInfoButton
            isEmpty={isEmpty}
            field={field}
            label={option.label}
            onButtonClick={handleFieldStatsButtonClick}
            hideTrigger={shouldHideInpectButton ?? isInternalEventRateFieldId}
          />
        );
      }
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
}

export type UseFieldStatsTrigger = typeof useFieldStatsTrigger;
