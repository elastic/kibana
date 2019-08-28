/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldSearch, EuiFilterSelectItem, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { UptimeFilterButton } from './uptime_filter_button';

export interface FilterPopoverProps {
  fieldName: string;
  id: string;
  isLoading: boolean;
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
  isLoading,
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
    // @ts-ignore zIndex prop is not described in the typing yet
    <EuiPopover
      button={
        <UptimeFilterButton
          isSelected={tempSelectedItems.length > 0}
          numFilters={items.length}
          numActiveFilters={tempSelectedItems.length}
          onClick={() => setIsOpen(!isOpen)}
          title={title}
        />
      }
      closePopover={() => {
        setIsOpen(false);
        onFilterFieldChange(fieldName, tempSelectedItems);
      }}
      id={id}
      isOpen={isOpen}
      withTitle
      zIndex={1000}
    >
      <EuiPopoverTitle>
        <EuiFieldSearch
          onSearch={query => setSearchQuery(query)}
          placeholder={isLoading ? 'Loading...' : `Search ${title}`}
        />
      </EuiPopoverTitle>
      {!isLoading &&
        itemsToDisplay.map(item => (
          <EuiFilterSelectItem
            checked={isItemSelected(tempSelectedItems, item)}
            key={item}
            onClick={() => {
              const index = tempSelectedItems.indexOf(item);
              const nextSelectedItems = [...tempSelectedItems];
              if (index >= 0) {
                nextSelectedItems.splice(index, 1);
              } else {
                nextSelectedItems.push(item);
              }
              setTempSelectedItems(nextSelectedItems);
            }}
          >
            {item}
          </EuiFilterSelectItem>
        ))}
    </EuiPopover>
  );
};
