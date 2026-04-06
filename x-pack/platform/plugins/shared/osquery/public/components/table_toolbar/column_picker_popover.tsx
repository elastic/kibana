/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiButtonEmpty, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const POPOVER_WIDTH = 250;
const POPOVER_CONTENT_STYLE = { width: POPOVER_WIDTH };

const COLUMNS_LABEL = i18n.translate('xpack.osquery.tableToolbar.columnsLabel', {
  defaultMessage: 'Columns',
});

export interface ColumnConfig {
  id: string;
  label: string;
}

interface ColumnPickerPopoverProps {
  columns: ColumnConfig[];
  visibleColumns: string[];
  onVisibleColumnsChange: (columnIds: string[]) => void;
  'data-test-subj'?: string;
}

const ColumnPickerPopoverComponent: React.FC<ColumnPickerPopoverProps> = ({
  columns,
  visibleColumns,
  onVisibleColumnsChange,
  'data-test-subj': dataTestSubj = 'column-picker',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectableOptions = useMemo<EuiSelectableOption[]>(() => {
    const visibleSet = new Set(visibleColumns);

    return columns.map(({ id, label }) => ({
      label,
      key: id,
      checked: visibleSet.has(id) ? 'on' : undefined,
    }));
  }, [columns, visibleColumns]);

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newVisible = newOptions.filter((opt) => opt.checked === 'on').map((opt) => opt.key!);
      onVisibleColumnsChange(newVisible);
    },
    [onVisibleColumnsChange]
  );

  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const panelProps = useMemo(
    () => ({ 'data-test-subj': `${dataTestSubj}-popover` }),
    [dataTestSubj]
  );

  const buttonLabel = i18n.translate('xpack.osquery.tableToolbar.columnsCountLabel', {
    defaultMessage: 'Columns: {count}',
    values: { count: visibleColumns.length },
  });

  const triggerButton = (
    <EuiButtonEmpty
      size="xs"
      iconType="listAdd"
      onClick={togglePopover}
      data-test-subj={`${dataTestSubj}-button`}
    >
      {buttonLabel}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={panelProps}
    >
      <EuiSelectable aria-label={COLUMNS_LABEL} options={selectableOptions} onChange={handleChange}>
        {(list) => (
          <div style={POPOVER_CONTENT_STYLE}>
            <EuiPopoverTitle paddingSize="s">{COLUMNS_LABEL}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

ColumnPickerPopoverComponent.displayName = 'ColumnPickerPopover';

export const ColumnPickerPopover = React.memo(ColumnPickerPopoverComponent);
