/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import {
  DELETE_CONNECTOR_BUTTON,
  EDIT_CONNECTOR_BUTTON,
} from '../../../../connectorland/translations';

interface Props<T> {
  rowItem: T;
  onEdit?: (rowItem: T) => void;
  onDelete?: (rowItem: T) => void;
  disabled?: boolean;
}

type RowActionsComponentType = <T>(props: Props<T>) => JSX.Element;

const RowActionsComponent = <T,>({ disabled, rowItem, onEdit, onDelete }: Props<T>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const handleEditConnector = useCallback(() => {
    closePopover();
    onEdit?.(rowItem);
  }, [closePopover, onEdit, rowItem]);

  const handleDeleteConnector = useCallback(() => {
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
            <EuiButtonEmpty iconType="pencil" onClick={handleEditConnector} disabled={disabled}>
              {EDIT_CONNECTOR_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {onDelete != null && (
          <EuiFlexItem>
            <EuiButtonEmpty iconType="trash" onClick={handleDeleteConnector} disabled={disabled}>
              {DELETE_CONNECTOR_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPopover>
  ) : null;
};

// casting to correctly infer the param of onEdit and onDelete when reusing this component
export const RowActions = React.memo(RowActionsComponent) as RowActionsComponentType;
