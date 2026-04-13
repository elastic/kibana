/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { EMPTY_FILTER_MESSAGE } from '../../../common/translations';
import { optionCountStyles } from './styles';

export interface MultiSelectFilterOption {
  key: string;
  label: string;
  checked?: 'on' | 'off';
}

interface UseFilterParams {
  buttonLabel?: string;
  ariaLabel?: string;
  onChange: (newOptions: MultiSelectFilterOption[]) => void;
  options: MultiSelectFilterOption[];
  renderOption?: (option: MultiSelectFilterOption) => React.ReactNode;
  selectedOptionKeys?: string[];
  dataTestSubj?: string;
}

export const MultiSelectFilter: React.FC<UseFilterParams> = ({
  buttonLabel,
  ariaLabel,
  onChange,
  options: rawOptions,
  selectedOptionKeys = [],
  renderOption,
  dataTestSubj,
}) => {
  const euiThemeContext = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleIsPopoverOpen = () => setIsPopoverOpen((prevValue) => !prevValue);
  const options: MultiSelectFilterOption[] = _.uniqBy(
    rawOptions.map(({ key, label }) => ({
      label,
      key,
      checked: selectedOptionKeys.includes(key) ? 'on' : undefined,
    })),
    'label'
  );

  return (
    <EuiPopover
      data-test-subj={dataTestSubj}
      ownFocus
      aria-label={ariaLabel}
      button={
        <EuiFilterButton
          iconType={'arrowDown'}
          onClick={toggleIsPopoverOpen}
          isSelected={isPopoverOpen}
          numFilters={options.length}
          hasActiveFilters={selectedOptionKeys.length > 0}
          numActiveFilters={selectedOptionKeys.length}
          aria-label={buttonLabel}
        >
          <EuiText size="s" className="eui-textTruncate">
            {buttonLabel}
          </EuiText>
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiSelectable
        options={options}
        searchable
        searchProps={{
          placeholder: buttonLabel,
        }}
        emptyMessage={EMPTY_FILTER_MESSAGE}
        onChange={onChange}
        singleSelection={false}
        renderOption={renderOption}
      >
        {(list, search) => (
          <div>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            <div css={optionCountStyles(euiThemeContext)}>
              <EuiTextColor color="subdued">
                {i18n.translate('xpack.searchInferenceEndpoints.filter.options', {
                  defaultMessage: '{totalCount, plural, one {# option} other {# options}}',
                  values: { totalCount: options.length },
                })}
              </EuiTextColor>
            </div>
            <EuiSpacer size="xs" />
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
