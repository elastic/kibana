/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

import type { RolloverField } from '../../../../constants';

import { rolloverFieldConfig } from './rollover_field_config';

interface RolloverAddRuleButtonProps<T extends RolloverField> {
  activeFields: T[];
  addButtonLabel: string;
  allFieldsInUseMessage: string;
  allFields: T[];
  dataTestSubj: string;
  onAdd: (field: T) => void;
}

export const RolloverAddRuleButton = <T extends RolloverField>({
  activeFields,
  addButtonLabel,
  allFieldsInUseMessage,
  allFields,
  dataTestSubj,
  onAdd,
}: RolloverAddRuleButtonProps<T>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const availableFields = allFields.filter((field) => !activeFields.includes(field));

  if (availableFields.length === 0) {
    return (
      <EuiToolTip content={allFieldsInUseMessage}>
        <EuiButton iconType="arrowDown" iconSide="right" isDisabled data-test-subj={dataTestSubj}>
          {addButtonLabel}
        </EuiButton>
      </EuiToolTip>
    );
  }

  return (
    <EuiPopover
      aria-label={addButtonLabel}
      button={
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
          data-test-subj={dataTestSubj}
        >
          {addButtonLabel}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={availableFields.map((field) => (
          <EuiContextMenuItem
            key={field}
            onClick={() => {
              onAdd(field);
              setIsPopoverOpen(false);
            }}
            data-test-subj={`rolloverAddField-${field}`}
          >
            {rolloverFieldConfig[field].menuLabel}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};
