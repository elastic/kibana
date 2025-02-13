/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import React, { useState } from 'react';
import { useCasesContext } from '../cases_context/use_cases_context';

interface Props {
  tooltipContent: string;
  buttonAriaLabel: string;
  onRemoveItem: () => void;
  children: React.ReactNode;
  dataTestSubjPrefix?: string;
}

const RemovableItemComponent: React.FC<Props> = ({
  children,
  tooltipContent,
  buttonAriaLabel,
  onRemoveItem,
  dataTestSubjPrefix = '',
}) => {
  const { permissions } = useCasesContext();
  const [isHovering, setIsHovering] = useState(false);

  const onFocus = () => setIsHovering(true);
  const onFocusLeave = () => setIsHovering(false);

  const dataTestSubj = dataTestSubjPrefix.length > 0 ? `${dataTestSubjPrefix}-remove-` : 'remove-';

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      justifyContent="spaceBetween"
      onMouseEnter={onFocus}
      onMouseLeave={onFocusLeave}
      data-test-subj={`${dataTestSubj}group`}
    >
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      {permissions.update && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="left"
            content={tooltipContent}
            data-test-subj={`${dataTestSubj}tooltip`}
          >
            <EuiButtonIcon
              css={{
                opacity: isHovering ? 1 : 0,
              }}
              onFocus={onFocus}
              onBlur={onFocusLeave}
              data-test-subj={`${dataTestSubj}button`}
              aria-label={buttonAriaLabel}
              iconType="cross"
              color="danger"
              iconSize="m"
              onClick={onRemoveItem}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

RemovableItemComponent.displayName = 'RemovableItem';

export const RemovableItem = React.memo(RemovableItemComponent);
