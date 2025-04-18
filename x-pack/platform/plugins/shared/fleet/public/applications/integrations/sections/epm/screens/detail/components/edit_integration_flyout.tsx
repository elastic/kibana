/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

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
  EuiComboBox,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import type { FleetStartServices } from '../../../../../../../plugin';

import { useGetCategoriesQuery, useUpdateCustomIntegration } from '../../../../../../../hooks';

import type { PackageInfo } from '../../../../../types';

export const EditIntegrationFlyout: React.FunctionComponent<{
  readMeContent: string | undefined;
  onClose: () => void;
  integrationName: string;
  miniIcon: React.ReactNode;
  packageInfo: PackageInfo | null;
  setIsEditOpen: (isOpen: boolean) => void;
  integration: string | null;
  services: FleetStartServices;
  onComplete: (arg0: {}) => void;
  existingCategories: any[];
}> = ({
  onClose,
  integrationName,
  readMeContent,
  miniIcon,
  packageInfo,
  setIsEditOpen,
  integration,
  services,
  onComplete,
  existingCategories,
}) => {
  const updateCustomIntegration = useUpdateCustomIntegration;

  const { data: categoriesData } = useGetCategoriesQuery({
    prerelease: true,
  });
  // we only need the parent categories for now, filter out any with parent_id fields to only leave the parents
  const parentCategories = categoriesData?.items.filter((item) => item.parent_id === undefined);

  // since the existing integration categories are stored as an array of ids, we need to map them to the titles from the parentCategories
  const initialSelectedCategories = existingCategories.map(
    (category) => parentCategories?.find((cat) => cat.id === category)?.title
  );

  // state section
  const [editedContent, setEditedContent] = useState(readMeContent);
  const [savingEdits, setSavingEdits] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialSelectedCategories.filter((category): category is string => category !== undefined)
  );

  const saveIntegrationEdits = async (updatedReadMe: string | undefined) => {
    setSavingEdits(true);

    const res = await updateCustomIntegration(packageInfo?.name || '', {
      readMeData: updatedReadMe,
      categories: selectedCategories
        .map((title) => parentCategories?.find((cat) => cat.title === title)?.id) // map the chosen titles back to ids as we store those
        .filter((id): id is string => id !== undefined), // filter out any undefined values due to typing
    });

    setSavingEdits(false);

    setIsEditOpen(false);
    // if everything is okay, then show success and redirect to new page
    if (!res.error) {
      services.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.fleet.epm.editIntegrationSuccessToastTitle', {
          defaultMessage: 'README updated',
        }),
        text: i18n.translate('xpack.fleet.epm.editIntegrationSuccessToastText', {
          defaultMessage:
            'The integration has been updated successfully. Redirecting you to the updated integration.',
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
        title: i18n.translate('xpack.fleet.epm.editIntegrationErrorToastTitle', {
          defaultMessage: 'Error updating integration',
        }),
        toastMessage: i18n.translate('xpack.fleet.epm.editIntegrationErrorToastText', {
          defaultMessage: 'There was an error updating the integration.',
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
              <h2 id="editIntegrationFlyoutTitle">Editing {integrationName}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.epm.editIntegrationFlyout.categoriesLabel"
              defaultMessage="Integration Categories"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.fleet.epm.editIntegrationFlyout.categoriesHelpText"
              defaultMessage="You can assign up to two categories to your integration."
            />
          }
        >
          <EuiComboBox
            fullWidth
            data-test-subj="editIntegrationFlyoutCategories"
            aria-label="Select categories"
            placeholder="Select categories"
            selectedOptions={selectedCategories.map((category) => ({
              label: category,
            }))}
            options={parentCategories?.map((category) => ({
              label: category.title,
              value: category.id,
              disabled: selectedCategories.length >= 2,
            }))}
            onChange={(selectedOptions) => {
              const selectedValues = selectedOptions.map((option) => option.label);
              setSelectedCategories(selectedValues);
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
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
