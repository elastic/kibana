/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSplitButton,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

const I18N_PREFIX = 'xpack.dataLifecyclePhases.defaultSnapshotRepositoryRequiredModal';

export interface DefaultSnapshotRepositoryRequiredModalProps {
  onCancel: () => void;
  createDefaultRepositoryUrl: string;
  /**
   * URL to the Snapshot and Restore repositories list. When the user already has repositories
   * configured (see `hasExistingRepositories`) the primary action links here so they can pick one
   * as the default instead of creating a new repository.
   */
  manageRepositoriesUrl?: string;
  /**
   * Whether the user already has at least one snapshot repository configured. When `true` (and a
   * `manageRepositoriesUrl` is provided) the modal directs the user to the repositories list to
   * select a default; otherwise it directs them to create a new default repository.
   */
  hasExistingRepositories?: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
  'data-test-subj'?: string;
}

export const DefaultSnapshotRepositoryRequiredModal = ({
  onCancel,
  createDefaultRepositoryUrl,
  manageRepositoriesUrl,
  hasExistingRepositories = false,
  onRefresh,
  isRefreshing,
  'data-test-subj': dataTestSubj = 'defaultSnapshotRepositoryRequiredModal',
}: DefaultSnapshotRepositoryRequiredModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'defaultSnapshotRepositoryRequiredModalTitle' });
  const { euiTheme } = useEuiTheme();

  // When the user already has repositories but none is set as the default, send them to the
  // repositories list to pick one. Otherwise send them to create a new default repository.
  const shouldManageExisting = hasExistingRepositories && Boolean(manageRepositoriesUrl);

  return (
    <EuiModal onClose={onCancel} aria-labelledby={titleId} maxWidth={euiTheme.breakpoint.s}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId} data-test-subj={`${dataTestSubj}Title`}>
          {i18n.translate(`${I18N_PREFIX}.title`, {
            defaultMessage: 'Default snapshot repository required',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          {shouldManageExisting
            ? i18n.translate(`${I18N_PREFIX}.descriptionSelectExisting`, {
                defaultMessage:
                  'To add a frozen phase, you need a default snapshot repository first. Set one of your existing repositories as the default in Snapshot and Restore, then refresh this panel.',
              })
            : i18n.translate(`${I18N_PREFIX}.description`, {
                defaultMessage:
                  'To add a frozen phase, you need a default snapshot repository first. Create one in Snapshot and Restore, then refresh this panel.',
              })}
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={`${dataTestSubj}CancelButton`}
              flush="left"
              onClick={onCancel}
            >
              {i18n.translate(`${I18N_PREFIX}.cancel`, {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSplitButton fill size="m">
              {shouldManageExisting ? (
                <EuiSplitButton.ActionPrimary
                  data-test-subj={`${dataTestSubj}ManageRepositoriesButton`}
                  href={manageRepositoriesUrl}
                  target="_blank"
                >
                  {i18n.translate(`${I18N_PREFIX}.manageRepositories`, {
                    defaultMessage: 'Manage repositories',
                  })}
                </EuiSplitButton.ActionPrimary>
              ) : (
                <EuiSplitButton.ActionPrimary
                  data-test-subj={`${dataTestSubj}CreateDefaultRepositoryButton`}
                  href={createDefaultRepositoryUrl}
                  target="_blank"
                >
                  {i18n.translate(`${I18N_PREFIX}.createDefaultRepository`, {
                    defaultMessage: 'Create default repository',
                  })}
                </EuiSplitButton.ActionPrimary>
              )}
              <EuiSplitButton.ActionSecondary
                iconType="refresh"
                isLoading={Boolean(isRefreshing)}
                disabled={Boolean(isRefreshing)}
                aria-label={i18n.translate(`${I18N_PREFIX}.refreshAriaLabel`, {
                  defaultMessage: 'Refresh snapshot repositories',
                })}
                data-test-subj={`${dataTestSubj}RefreshButton`}
                onClick={onRefresh}
              />
            </EuiSplitButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
