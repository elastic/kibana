/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldSearch, EuiFilterSelectItem, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { UptimeFilterButton } from './uptime_filter_button';
import { toggleSelectedItems } from './toggle_selected_item';
import { LocationLink } from '../monitor_list';

export interface FilterPopoverProps {
  fieldName: string;
  id: string;
  loading: boolean;
  isDisabled?: boolean;
  items: string[];
  onFilterFieldChange: (fieldName: string, values: string[]) => void;
  selectedItems: string[];
  title: string;
}

const isItemSelected = (selectedItems: string[], item: string): 'on' | undefined =>
  selectedItems.find(selected => selected === item) ? 'on' : undefined;

export const FilterPopover = ({
  fieldName,
  id,
  isDisabled,
  loading,
  items,
  onFilterFieldChange,
  selectedItems,
  title,
}: FilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [itemsToDisplay, setItemsToDisplay] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tempSelectedItems, setTempSelectedItems] = useState<string[]>(selectedItems);

  useEffect(() => {
    if (searchQuery !== '') {
      const toDisplay = items.filter(item => item.indexOf(searchQuery) >= 0);
      setItemsToDisplay(toDisplay);
    } else {
      setItemsToDisplay(items);
    }
  }, [searchQuery, items]);

  return (
    <EuiPopover
      button={
        <UptimeFilterButton
          isDisabled={isDisabled}
          isSelected={tempSelectedItems.length > 0}
          numFilters={items.length}
          numActiveFilters={tempSelectedItems.length}
          onClick={() => {
            setIsOpen(!isOpen);
            onFilterFieldChange(fieldName, tempSelectedItems);
          }}
          title={title}
        />
      }
      closePopover={() => {
        setIsOpen(false);
        onFilterFieldChange(fieldName, tempSelectedItems);
      }}
      data-test-subj={`filter-popover_${id}`}
      id={id}
      isOpen={isOpen}
      ownFocus={true}
      withTitle
      zIndex={1000}
    >
      <EuiPopoverTitle>
        <EuiFieldSearch
          disabled={items.length === 0}
          onSearch={query => setSearchQuery(query)}
          placeholder={
            loading
              ? i18n.translate('xpack.uptime.filterPopout.loadingMessage', {
                  defaultMessage: 'Loading...',
                })
              : i18n.translate('xpack.uptime.filterPopout.searchMessage', {
                  defaultMessage: 'Search {title}',
                  values: {
                    title,
                  },
                })
          }
        />
      </EuiPopoverTitle>
      {!loading &&
        itemsToDisplay.map(item => (
          <EuiFilterSelectItem
            checked={isItemSelected(tempSelectedItems, item)}
            data-test-subj={`filter-popover-item_${item}`}
            key={item}
            onClick={() => toggleSelectedItems(item, tempSelectedItems, setTempSelectedItems)}
          >
            {item}
          </EuiFilterSelectItem>
        ))}
      {id === 'location' && items.length === 0 && <LocationLink />}
    </EuiPopover>
  );
};
