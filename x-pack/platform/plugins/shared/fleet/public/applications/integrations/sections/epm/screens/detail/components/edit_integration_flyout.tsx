/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownEditor,
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import type { FleetStartServices } from '../../../../../../../plugin';

import { sendGetFileByPath, useUpdateCustomIntegration } from '../../../../../../../hooks';

import type { PackageInfo } from '../../../../../types';

export const EditIntegrationFlyout: React.FunctionComponent<{
  onClose: () => void;
  integrationName: string;
  miniIcon: React.ReactNode;
  packageInfo: PackageInfo | null;
  setIsEditOpen: (isOpen: boolean) => void;
  integration: string | null;
  services: FleetStartServices;
  onComplete: (arg0: {}) => void;
}> = ({
  onClose,
  integrationName,

  miniIcon,
  packageInfo,
  setIsEditOpen,
  integration,
  services,
  onComplete,
}) => {
  const updateCustomIntegration = useUpdateCustomIntegration;
  const [editedContent, setEditedContent] = useState<string>();
  const [savingEdits, setSavingEdits] = useState(false);
  const [readmeLoading, setReadmeLoading] = useState(true);

  // get the readme content from the packageInfo
  useEffect(() => {
    const readmePath = packageInfo?.readme;
    if (!readmePath) {
      setReadmeLoading(false);
      return;
    }
    sendGetFileByPath(readmePath).then((res) => {
      setEditedContent(res.data || '');
      setReadmeLoading(false);
    });
  }, [packageInfo]);

  const saveIntegrationEdits = async (updatedReadMe: string | undefined) => {
    setSavingEdits(true);

    const res = await updateCustomIntegration(packageInfo?.name || '', {
      readMeData: updatedReadMe,
      categories: [],
    });

    setSavingEdits(false);

    setIsEditOpen(false);
    // if everything is okay, then show success and redirect to new page
    if (!res.error) {
      services.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.fleet.epm.editReadMeSuccessToastTitle', {
          defaultMessage: 'README updated',
        }),
        text: i18n.translate('xpack.fleet.epm.editReadMeSuccessToastText', {
          defaultMessage:
            'The README content has been updated successfully. Redirecting you to the updated integration.',
        }),
      });
      setTimeout(() => {
        // navigate to new page after 2 seconds
        const urlParts = {
          pkgkey: `${packageInfo?.name}-${res.data.result.version}`,
          ...(integration ? { integration } : {}),
        };
        onComplete(urlParts);
      }, 2000);
    } else {
      services.notifications.toasts.addError(res.error, {
        title: i18n.translate('xpack.fleet.epm.editReadMeErrorToastTitle', {
          defaultMessage: 'Error updating README file',
        }),
        toastMessage: i18n.translate('xpack.fleet.epm.editReadMeErrorToastText', {
          defaultMessage: 'There was an error updating the README content.',
        }),
      });
    }
  };
  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby="editIntegrationFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>{miniIcon}</EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle>
              <h2 id="editIntegrationFlyoutTitle">
                <FormattedMessage
                  id="xpack.fleet.epm.editIntegrationFlyout.title"
                  defaultMessage="Editing {integrationName}"
                  values={{ integrationName }}
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {readmeLoading ? (
          <EuiLoadingSpinner />
        ) : (
          <EuiMarkdownEditor
            aria-label="Edit"
            placeholder={`${i18n.translate(
              'xpack.fleet.epm.editIntegrationFlyout.markdownEditorPlaceholder',
              {
                defaultMessage: 'Edit the README content for {integrationName}...',
                values: { integrationName },
              }
            )}...`}
            value={editedContent!}
            onChange={setEditedContent}
            readOnly={false}
            height={600}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage
                id="xpack.fleet.editIntegrationFlyout.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isLoading={savingEdits}
              fill
              color="primary"
              onClick={() => saveIntegrationEdits(editedContent)}
            >
              <FormattedMessage
                id="xpack.fleet.editIntegrationFlyout.saveButtonLabel"
                defaultMessage="Save Changes"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
