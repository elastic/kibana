/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import type {
  EuiComboBoxOptionOption,
  EuiComboBoxSingleSelectionShape,
  EuiFormControlLayoutProps,
} from '@elastic/eui';
import { EuiInputPopover, htmlIdGenerator, EuiFormControlLayout, EuiFieldText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useFieldStatsTrigger } from '../use_field_stats_trigger';
import { OptionsListPopover } from './option_list_popover';
import type { DropDownLabel } from './types';

const MIN_POPOVER_WIDTH = 400;

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

interface OptionListWithFieldStatsProps
  extends Pick<EuiFormControlLayoutProps, 'prepend' | 'compressed'> {
  options: DropDownLabel[];
  placeholder?: string;
  'aria-label'?: string;
  singleSelection?: boolean | EuiComboBoxSingleSelectionShape;
  onChange:
    | ((newSuggestions: DropDownLabel[]) => void)
    | ((newSuggestions: EuiComboBoxOptionOption[]) => void);
  selectedOptions?: Array<{ label: string }>;
  fullWidth?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  isInvalid?: boolean;
  'data-test-subj'?: string;
}

export const OptionListWithFieldStats: FC<OptionListWithFieldStatsProps> = ({
  options,
  placeholder,
  singleSelection = false,
  onChange,
  selectedOptions,
  fullWidth,
  isDisabled,
  isLoading,
  isClearable = true,
  prepend,
  compressed,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
}) => {
  const { renderOption } = useFieldStatsTrigger<DropDownLabel>();
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const popoverId = useMemo(() => htmlIdGenerator()(), []);
  const comboBoxOptions: DropDownLabel[] = useMemo(
    () =>
      Array.isArray(options)
        ? options.map(({ isEmpty, ...o }) => ({
            ...o,
            css: optionCss,
            // Change data-is-empty- because EUI is passing all props to dom element
            // so isEmpty is invalid, but we need this info to render option correctly
            'data-is-empty': isEmpty,
          }))
        : [],
    [options]
  );
  const hasSelections = useMemo(() => selectedOptions?.length ?? 0 > 0, [selectedOptions]);

  const value = singleSelection && selectedOptions?.[0]?.label ? selectedOptions?.[0]?.label : '';
  return (
    <EuiInputPopover
      fullWidth={fullWidth}
      data-test-subj={dataTestSubj}
      id={popoverId}
      input={
        <EuiFormControlLayout
          prepend={prepend}
          compressed={compressed}
          fullWidth={fullWidth}
          // Adding classname to make functional tests similar to EuiComboBox
          className={singleSelection ? 'euiComboBox__inputWrap--plainText' : ''}
          data-test-subj="comboBoxInput"
          clear={isClearable && hasSelections ? { onClick: onChange.bind(null, []) } : undefined}
          isDropdown={true}
        >
          <EuiFieldText
            fullWidth={fullWidth}
            disabled={isDisabled}
            placeholder={placeholder}
            data-test-subj="comboBoxSearchInput"
            onClick={setPopoverOpen.bind(null, true)}
            type="text"
            role="combobox"
            controlOnly
            aria-expanded={isPopoverOpen ? 'true' : 'false'}
            aria-label={
              placeholder ??
              i18n.translate('xpack.ml.controls.optionsList.popover.selectOptionAriaLabel', {
                defaultMessage: 'Select an option',
              })
            }
            onChange={() => {}}
            value={value}
          />
        </EuiFormControlLayout>
      }
      hasArrow={false}
      repositionOnScroll
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
      panelMinWidth={MIN_POPOVER_WIDTH}
      initialFocus={'[data-test-subj=optionsList-control-search-input]'}
      closePopover={setPopoverOpen.bind(null, false)}
      panelProps={{
        'aria-label': i18n.translate('xpack.ml.controls.optionsList.popover.ariaLabel', {
          defaultMessage: 'Popover for {ariaLabel}',
          values: { ariaLabel },
        }),
      }}
    >
      {isPopoverOpen ? (
        <OptionsListPopover
          options={comboBoxOptions}
          renderOption={renderOption}
          singleSelection={singleSelection}
          onChange={onChange}
          setPopoverOpen={setPopoverOpen}
          isLoading={isLoading}
        />
      ) : null}
    </EuiInputPopover>
  );
};
