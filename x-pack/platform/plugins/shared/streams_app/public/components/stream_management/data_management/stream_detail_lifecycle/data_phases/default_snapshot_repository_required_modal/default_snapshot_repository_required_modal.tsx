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

export interface DefaultSnapshotRepositoryRequiredModalProps {
  onCancel: () => void;
  createDefaultRepositoryUrl: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
  'data-test-subj'?: string;
}

export const DefaultSnapshotRepositoryRequiredModal = ({
  onCancel,
  createDefaultRepositoryUrl,
  onRefresh,
  isRefreshing,
  'data-test-subj': dataTestSubj = 'defaultSnapshotRepositoryRequiredModal',
}: DefaultSnapshotRepositoryRequiredModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'defaultSnapshotRepositoryRequiredModalTitle' });
  const { euiTheme } = useEuiTheme();

  return (
    <EuiModal onClose={onCancel} aria-labelledby={titleId} maxWidth={euiTheme.breakpoint.s}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId} data-test-subj={`${dataTestSubj}Title`}>
          {i18n.translate('xpack.streams.defaultSnapshotRepositoryRequiredModal.title', {
            defaultMessage: 'Default snapshot repository required',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          {i18n.translate('xpack.streams.defaultSnapshotRepositoryRequiredModal.description', {
            defaultMessage:
              'To add a frozen phase to a stream using a data stream lifecycle, first create a default snapshot repository, then refresh this panel.',
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
              {i18n.translate('xpack.streams.defaultSnapshotRepositoryRequiredModal.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSplitButton fill size="m">
              <EuiSplitButton.ActionPrimary
                data-test-subj={`${dataTestSubj}CreateDefaultRepositoryButton`}
                href={createDefaultRepositoryUrl}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.streams.defaultSnapshotRepositoryRequiredModal.createDefaultRepository',
                  {
                    defaultMessage: 'Create default repository',
                  }
                )}
              </EuiSplitButton.ActionPrimary>
              <EuiSplitButton.ActionSecondary
                iconType="refresh"
                isLoading={Boolean(isRefreshing)}
                disabled={Boolean(isRefreshing)}
                aria-label={i18n.translate(
                  'xpack.streams.defaultSnapshotRepositoryRequiredModal.refreshAriaLabel',
                  {
                    defaultMessage: 'Refresh snapshot repositories',
                  }
                )}
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
