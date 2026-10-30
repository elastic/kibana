/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAddToCaseAction } from './use_add_to_case_action';

const ADD_TO_CASE = i18n.translate(
  'xpack.osquery.pack.queriesTable.addToCaseResultsActionAriaLabel',
  {
    defaultMessage: 'Add to Case',
  }
);

export interface AddToCaseButtonProps {
  queryId?: string;
  agentIds?: string[];
  actionId: string;
  isIcon?: boolean;
  isDisabled?: boolean;
  iconProps?: Record<string, string>;
  scheduleId?: string;
  executionCount?: number;
  displayAsMenuItem?: boolean;
  onMenuItemClick?: () => void;
  size?: 'xs' | 's' | 'm';
}

export const AddToCaseButton: React.FC<AddToCaseButtonProps> = ({
  actionId,
  agentIds = [],
  queryId = '',
  isIcon = false,
  isDisabled,
  iconProps,
  scheduleId,
  executionCount,
  displayAsMenuItem = false,
  onMenuItemClick,
  size = 'xs',
}) => {
  const { hasCasesPermissions, handleClick } = useAddToCaseAction({
    actionId,
    agentIds,
    queryId,
    scheduleId,
    executionCount,
  });

  const handleMenuItemClick = useCallback(() => {
    onMenuItemClick?.();
    handleClick();
  }, [onMenuItemClick, handleClick]);

  if (displayAsMenuItem) {
    return (
      <EuiContextMenuItem
        icon="casesApp"
        disabled={isDisabled || !hasCasesPermissions}
        onClick={handleMenuItemClick}
      >
        {ADD_TO_CASE}
      </EuiContextMenuItem>
    );
  }

  if (isIcon) {
    return (
      <EuiToolTip content={<EuiFlexItem>{ADD_TO_CASE}</EuiFlexItem>}>
        <EuiButtonIcon
          iconType={'casesApp'}
          onClick={handleClick}
          isDisabled={isDisabled || !hasCasesPermissions}
          aria-label={ADD_TO_CASE}
          {...iconProps}
        />
      </EuiToolTip>
    );
  }

  return (
    <EuiButtonEmpty
      size={size}
      iconType="casesApp"
      onClick={handleClick}
      isDisabled={isDisabled || !hasCasesPermissions}
      aria-label={ADD_TO_CASE}
    >
      {ADD_TO_CASE}
    </EuiButtonEmpty>
  );
};
