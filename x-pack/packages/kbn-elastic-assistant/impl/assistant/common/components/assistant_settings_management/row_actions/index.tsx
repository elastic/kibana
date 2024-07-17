/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import * as i18n from './translations';

interface Props<T> {
  isDeletable?: boolean;
  isEditable?: boolean;
  onDelete?: (rowItem: T) => void;
  onEdit?: (rowItem: T) => void;
  rowItem: T;
}

type RowActionsComponentType = <T>(props: Props<T>) => JSX.Element;

const RowActionsComponent = <T,>({
  isDeletable = true,
  isEditable = true,
  onDelete,
  onEdit,
  rowItem,
}: Props<T>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const handleEdit = useCallback(() => {
    closePopover();
    onEdit?.(rowItem);
  }, [closePopover, onEdit, rowItem]);

  const handleDelete = useCallback(() => {
    closePopover();
    onDelete?.(rowItem);
  }, [closePopover, onDelete, rowItem]);

  const onButtonClick = useCallback(() => setIsPopoverOpen((prevState) => !prevState), []);
  return onEdit || onDelete ? (
    <EuiPopover
      button={
        <EuiButtonIcon
          color="success"
          iconType="boxesHorizontal"
          disabled={rowItem == null}
          onClick={onButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
    >
      <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
        {onEdit != null && (
          <EuiFlexItem>
            <EuiButtonEmpty
              iconType="pencil"
              onClick={handleEdit}
              disabled={!isEditable}
              color="text"
            >
              {i18n.EDIT_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {onDelete != null && (
          <EuiFlexItem>
            <EuiButtonEmpty
              aria-label={i18n.DELETE_BUTTON}
              iconType="trash"
              onClick={handleDelete}
              disabled={!isDeletable}
              color="text"
            >
              {i18n.DELETE_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPopover>
  ) : null;
};

// casting to correctly infer the param of onEdit and onDelete when reusing this component
export const RowActions = React.memo(RowActionsComponent) as RowActionsComponentType;
