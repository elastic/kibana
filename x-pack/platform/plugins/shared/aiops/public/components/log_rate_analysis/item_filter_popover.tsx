/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, type ChangeEvent, type FC } from 'react';
import { css } from '@emotion/react';

import {
  euiYScrollWithShadows,
  useEuiTheme,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ItemFilterApplyButton } from './item_filter_apply_button';

interface ItemFilterPopoverProps {
  dataTestSubj: string;
  disabled?: boolean;
  disabledApplyButton?: boolean;
  disabledApplyTooltipContent?: string;
  helpText: string;
  itemSearchAriaLabel: string;
  initialSkippedItems?: string[];
  popoverButtonTitle: string;
  selectedItemLimit?: number;
  uniqueItemNames: string[];
  onChange: (skippedItems: string[]) => void;
}

// This component is mostly inspired by EUI's Data Grid Column Selector
// https://github.com/elastic/eui/blob/main/packages/eui/src/components/datagrid/controls/column_selector.tsx
export const ItemFilterPopover: FC<ItemFilterPopoverProps> = ({
  dataTestSubj,
  disabled,
  disabledApplyButton,
  disabledApplyTooltipContent,
  helpText,
  itemSearchAriaLabel,
  initialSkippedItems = [],
  popoverButtonTitle,
  selectedItemLimit = 2,
  uniqueItemNames,
  onChange,
}) => {
  const euiThemeContext = useEuiTheme();
  // Inspired by https://github.com/elastic/eui/blob/v94.0.0/src/components/datagrid/controls/_data_grid_column_selector.scss
  const itemSelectPopover = useMemo(
    () => css`
      ${euiYScrollWithShadows(euiThemeContext, {})}
      max-height: 400px;
    `,
    [euiThemeContext]
  );

  const [isTouched, setIsTouched] = useState(false);
  const [itemSearchText, setItemSearchText] = useState('');
  const [skippedItems, setSkippedItems] = useState<string[]>(initialSkippedItems);
  const setItemsFilter = (itemNames: string[], checked: boolean) => {
    let updatedSkippedItems = [...skippedItems];
    if (!checked) {
      updatedSkippedItems.push(...itemNames);
    } else {
      updatedSkippedItems = skippedItems.filter((d) => !itemNames.includes(d));
    }
    // Ensure there are no duplicates
    setSkippedItems([...new Set(updatedSkippedItems)]);
    setIsTouched(true);
  };

  const [isItemSelectionPopoverOpen, setIsItemSelectionPopoverOpen] = useState(false);
  const onItemSelectionButtonClick = () => setIsItemSelectionPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsItemSelectionPopoverOpen(false);

  const filteredUniqueItemNames = useMemo(() => {
    return uniqueItemNames.filter(
      (d) => d.toLowerCase().indexOf(itemSearchText.toLowerCase()) !== -1
    );
  }, [itemSearchText, uniqueItemNames]);

  // If the supplied list of unique field names changes, do a sanity check to only
  // keep field names in the list of skipped fields that still are in the list of unique fields.
  useEffect(() => {
    setSkippedItems((previousSkippedItems) =>
      previousSkippedItems.filter((d) => uniqueItemNames.includes(d))
    );
  }, [uniqueItemNames]);

  // If the supplied list of initial skipped items changes, only update if
  // the list hasn't been touched yet.
  useEffect(() => {
    if (!isTouched) {
      setSkippedItems(initialSkippedItems);
    }
  }, [initialSkippedItems, isTouched]);

  const selectedItemCount = uniqueItemNames.length - skippedItems.length;

  return (
    <EuiPopover
      anchorPosition="downLeft"
      panelPaddingSize="s"
      panelStyle={{ minWidth: '20%' }}
      button={
        <EuiButton
          data-test-subj={dataTestSubj}
          onClick={onItemSelectionButtonClick}
          disabled={disabled}
          size="s"
          iconType="arrowDown"
          iconSide="right"
          iconSize="s"
          color="text"
        >
          {popoverButtonTitle}
        </EuiButton>
      }
      isOpen={isItemSelectionPopoverOpen}
      closePopover={closePopover}
    >
      <EuiPopoverTitle>
        <EuiText size="xs" color="subdued" style={{ maxWidth: '400px' }}>
          {helpText}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFieldText
          compressed
          placeholder={i18n.translate('xpack.aiops.analysis.fieldSelectorPlaceholder', {
            defaultMessage: 'Search',
          })}
          aria-label={itemSearchAriaLabel}
          value={itemSearchText}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setItemSearchText(e.currentTarget.value)}
          data-test-subj="aiopsFieldSelectorSearch"
        />
      </EuiPopoverTitle>
      <div css={itemSelectPopover} data-test-subj="aiopsFieldSelectorFieldNameList">
        {filteredUniqueItemNames.map((fieldName) => (
          <div key={fieldName} css={{ padding: '4px' }}>
            <EuiSwitch
              data-test-subj={`aiopsFieldSelectorFieldNameListItem${
                !skippedItems.includes(fieldName) ? ' checked' : ''
              }`}
              mini
              label={fieldName}
              onChange={(e) => setItemsFilter([fieldName], e.target.checked)}
              checked={!skippedItems.includes(fieldName)}
            />
          </div>
        ))}
      </div>
      <EuiPopoverFooter>
        <EuiFlexGroup
          gutterSize="s"
          responsive={false}
          justifyContent="spaceBetween"
          alignItems="center"
        >
          <>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="left"
                onClick={() => setItemsFilter(filteredUniqueItemNames, true)}
                disabled={itemSearchText.length > 0 && filteredUniqueItemNames.length === 0}
                data-test-subj="aiopsFieldSelectorSelectAllFieldsButton"
              >
                {itemSearchText.length > 0 ? (
                  <FormattedMessage
                    id="xpack.aiops.logRateAnalysis.page.fieldSelector.selectAllSearchedItems"
                    defaultMessage="Select filtered"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.aiops.logRateAnalysis.page.fieldSelector.selectAllItems"
                    defaultMessage="Select all"
                  />
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="right"
                onClick={() => setItemsFilter(filteredUniqueItemNames, false)}
                disabled={itemSearchText.length > 0 && filteredUniqueItemNames.length === 0}
                data-test-subj="aiopsFieldSelectorDeselectAllFieldsButton"
              >
                {itemSearchText.length > 0 ? (
                  <FormattedMessage
                    id="xpack.aiops.logRateAnalysis.page.fieldSelector.deselectAllSearchedItems"
                    defaultMessage="Deselect filtered"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.aiops.logRateAnalysis.page.fieldSelector.deselectAllItems"
                    defaultMessage="Deselect all"
                  />
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
          <EuiFlexItem grow={false}>
            <ItemFilterApplyButton
              onClick={() => {
                onChange(skippedItems);
                setItemSearchText('');
                setIsItemSelectionPopoverOpen(false);
                closePopover();
              }}
              disabled={disabledApplyButton || selectedItemCount < selectedItemLimit || !isTouched}
              tooltipContent={
                selectedItemCount < selectedItemLimit ? disabledApplyTooltipContent : undefined
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
