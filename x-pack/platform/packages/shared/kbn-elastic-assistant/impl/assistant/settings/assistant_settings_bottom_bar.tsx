/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import React from 'react';
import { CANCEL, SAVE } from './translations';

export const AssistantSettingsBottomBar: React.FC<{
  hasPendingChanges: boolean;
  onCancelClick: () => void;
  onSaveButtonClicked: () => void;
}> = React.memo(({ hasPendingChanges, onCancelClick, onSaveButtonClicked }) =>
  hasPendingChanges ? (
    <EuiPageTemplate.BottomBar paddingSize="s" position="fixed" data-test-subj="bottom-bar">
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="text"
            iconType="cross"
            data-test-subj="cancel-button"
            onClick={onCancelClick}
          >
            {CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            type="submit"
            data-test-subj="save-button"
            onClick={onSaveButtonClicked}
            iconType="check"
            fill
          >
            {SAVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.BottomBar>
  ) : null
);
AssistantSettingsBottomBar.displayName = 'AssistantSettingsBottomBar';
