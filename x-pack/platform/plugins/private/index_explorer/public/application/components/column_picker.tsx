/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import type { FieldInfo } from '../../../common/types';
import { i18nTexts } from '../translations';

interface ColumnPickerProps {
  readonly fields: readonly FieldInfo[];
  readonly isVisible: (name: string) => boolean;
  readonly onToggle: (name: string) => void;
  readonly onReset: () => void;
  readonly isCustomized: boolean;
}

/** Popover checklist for choosing which columns the table shows. */
export function ColumnPicker({
  fields,
  isVisible,
  onToggle,
  onReset,
  isCustomized,
}: ColumnPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleCount = fields.filter(({ name }) => isVisible(name)).length;
  const options: EuiSelectableOption[] = fields.map(({ name, type }) => ({
    label: name,
    key: name,
    checked: isVisible(name) ? 'on' : undefined,
    append: type,
  }));

  return (
    <EuiPopover
      aria-label={i18nTexts.columnsTitle}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiButtonEmpty
          size="s"
          iconType="table"
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj="indexExplorerColumnPicker"
        >
          {i18nTexts.columnsButton(visibleCount, fields.length)}
        </EuiButtonEmpty>
      }
    >
      <EuiSelectable
        searchable
        aria-label={i18nTexts.columnsTitle}
        searchProps={{ placeholder: i18nTexts.columnsSearchPlaceholder, compressed: true }}
        options={options}
        onChange={(_options, _event, changed) => onToggle(changed.label)}
        listProps={{ bordered: false, showIcons: true }}
        css={{ width: 360 }}
        data-test-subj="indexExplorerColumnPickerList"
      >
        {(list, searchField) => (
          <>
            <EuiPopoverTitle paddingSize="s">{searchField}</EuiPopoverTitle>
            {list}
            <EuiPopoverFooter paddingSize="s">
              <EuiButtonEmpty
                size="xs"
                iconType="refresh"
                isDisabled={!isCustomized}
                onClick={onReset}
                data-test-subj="indexExplorerResetColumns"
              >
                {i18nTexts.resetColumns}
              </EuiButtonEmpty>
            </EuiPopoverFooter>
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}
