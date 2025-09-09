/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBottomBar, EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

interface Props {
  isLoading: boolean;
  onSave: () => void;
  onDiscardChanges: () => void;
  unsavedChangesCount: number;
  areChangesInvalid?: boolean;
}

export const BottomBarActions: React.FC<Props> = ({
  isLoading,
  onSave,
  onDiscardChanges,
  unsavedChangesCount,
  areChangesInvalid,
}) => {
  if (unsavedChangesCount === 0) return null;

  return (
    <EuiBottomBar paddingSize="s" position="fixed">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p>
              {unsavedChangesCount} {unsavedChangesCount === 1 ? 'change' : 'changes'}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                color="text"
                onClick={onDiscardChanges}
                data-test-subj="agentBuilderDiscard"
              >
                Discard
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isLoading}
                isDisabled={!!areChangesInvalid}
                onClick={onSave}
                data-test-subj="agentBuilderSave"
              >
                Save changes
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
};
