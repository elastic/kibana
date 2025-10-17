/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBottomBar, EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
    <EuiBottomBar
      paddingSize="s"
      position="fixed"
      aria-label={i18n.translate('xpack.onechat.management.bottomBar.ariaLabel', {
        defaultMessage: 'Settings actions',
      })}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p aria-live="polite" aria-atomic="true" data-test-subj="unsavedChangesCount">
              {i18n.translate('xpack.onechat.management.bottomBar.unsavedChangesCount', {
                defaultMessage: '{count, plural, one {# change} other {# changes}}',
                values: { count: unsavedChangesCount },
              })}
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
                aria-label={i18n.translate('xpack.onechat.management.bottomBar.discardAria', {
                  defaultMessage: 'Discard unsaved changes',
                })}
              >
                {i18n.translate('xpack.onechat.management.bottomBar.discard', {
                  defaultMessage: 'Discard',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isLoading}
                isDisabled={!!areChangesInvalid}
                onClick={onSave}
                data-test-subj="agentBuilderSave"
                aria-label={i18n.translate('xpack.onechat.management.bottomBar.saveAria', {
                  defaultMessage: 'Save changes',
                })}
              >
                {i18n.translate('xpack.onechat.management.bottomBar.save', {
                  defaultMessage: 'Save changes',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
};
