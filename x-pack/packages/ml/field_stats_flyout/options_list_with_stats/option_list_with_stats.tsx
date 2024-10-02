/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiInputPopover,
  htmlIdGenerator,
  EuiIcon,
  EuiBadge,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
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

const FALLBACK_PLACEHOLDER = i18n.translate('xpack.plugins.ml.selectOption.placeholder', {
  defaultMessage: 'Any',
});
interface OptionListWithFieldStatsProps {
  options: DropDownLabel[];
  placeholder?: string;
  'aria-label'?: string;
  singleSelection?: boolean;
  // renderOption: (option: DropDownLabel, searchValue: string) => React.ReactNode;
  onChange: (newSuggestions: DropDownLabel[]) => void;
  selectedOptions?: Array<{ label: string }>;
  fullWidth?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  isInvalid?: boolean;
}
export const OptionListWithFieldStats: FC<OptionListWithFieldStatsProps> = ({
  options,
  placeholder,
  singleSelection,
  onChange,
  selectedOptions,
  fullWidth,
  isDisabled,
  isLoading,
  isClearable,
  'aria-label': ariaLabel,
}) => {
  const { renderOption } = useFieldStatsTrigger();
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
  const id = useMemo(() => htmlIdGenerator()(), []);
  const selectionDisplayNode = singleSelection
    ? selectedOptions?.[0]?.label
    : selectedOptions?.map((option) => (
        <EuiFlexItem grow={false} key={`${id}-${option.label}`}>
          <EuiBadge className="euiComboBoxPill eui-textTruncate" color="hollow">
            {option.label}
          </EuiBadge>
        </EuiFlexItem>
      ));

  const button = (
    <>
      <EuiFilterButton
        isDisabled={isDisabled}
        badgeColor="success"
        iconType="arrowDown"
        isLoading={isLoading}
        grow
        css={css({
          padding: hasSelections ? euiThemeVars.euiSizeXS : undefined,
          height: euiThemeVars.euiButtonHeight,
          fontWeight: euiThemeVars.euiFontWeightRegular,
          color: hasSelections ? euiThemeVars.euiTextColor : euiThemeVars.euiTextSubduedColor,
        })}
        data-test-subj={`optionsList-control-${id}`}
        onClick={() => setPopoverOpen(true)}
        isSelected={isPopoverOpen}
        textProps={{ className: 'optionsList--selectionText' }}
        aria-label={ariaLabel}
        aria-expanded={isPopoverOpen}
        aria-controls={popoverId}
        role="combobox"
      >
        <EuiFlexItem className="euiComboBox__inputWrap">
          {hasSelections ? (
            <EuiFlexItem css={css({ paddingLeft: 4 })}>{selectionDisplayNode}</EuiFlexItem>
          ) : (
            placeholder ?? FALLBACK_PLACEHOLDER
          )}
          {isClearable && hasSelections ? (
            <button
              style={{ marginLeft: euiThemeVars.euiSizeS }}
              type="button"
              className={'euiFormControlLayoutClearButton'}
              onClick={() => onChange([])}
              aria-label={i18n.translate('xpack.plugins.ml.controls.optionsList.clearButtonLabel', {
                defaultMessage: 'Clear',
              })}
            >
              <EuiIcon className="euiFormControlLayoutClearButton__icon" type="cross" />
            </button>
          ) : null}
        </EuiFlexItem>
      </EuiFilterButton>
    </>
  );

  return (
    <EuiFilterGroup fullWidth={fullWidth} css={css({ width: '100%' })}>
      <EuiInputPopover
        id={popoverId}
        ownFocus
        input={button}
        hasArrow={false}
        repositionOnScroll
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        panelMinWidth={MIN_POPOVER_WIDTH}
        initialFocus={'[data-test-subj=optionsList-control-search-input]'}
        closePopover={setPopoverOpen.bind(null, false)}
        panelProps={{
          'aria-label': i18n.translate('xpack.plugins.ml.controls.optionsList.popover.ariaLabel', {
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
    </EuiFilterGroup>
  );
};
