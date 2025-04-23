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
  EuiComboBox,
  EuiFormRow,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import type { FleetStartServices } from '../../../../../../../plugin';

import {
  sendGetFileByPath,
  useGetCategoriesQuery,
  useUpdateCustomIntegration,
} from '../../../../../../../hooks';

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
  existingCategories: string[];
}> = ({
  onClose,
  integrationName,
  miniIcon,
  packageInfo,
  setIsEditOpen,
  integration,
  services,
  onComplete,
  existingCategories,
}) => {
  const updateCustomIntegration = useUpdateCustomIntegration;

  // Get all the possible categories
  const { data: categoriesData } = useGetCategoriesQuery({
    prerelease: true,
  });
  // We only need the parent categories for now, filter out any with parent_id fields to only leave the parents
  const parentCategories = categoriesData?.items.filter((item) => item.parent_id === undefined);

  // state section
  const [savingEdits, setSavingEdits] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [editedContent, setEditedContent] = useState<string>();
  const [readmeLoading, setReadmeLoading] = useState(true);
  const [categoriesInitialized, setCategoriesInitialized] = useState(false);

  // Set initial categories only once when data is available
  useEffect(() => {
    // Only run this effect if we haven't initialized categories yet.
    if (!categoriesInitialized && parentCategories?.length && existingCategories.length) {
      const initialCategories = existingCategories
        .map((categoryId) => parentCategories.find((cat) => cat.id === categoryId)?.title)
        .filter((title): title is string => Boolean(title));

      if (initialCategories.length) {
        setSelectedCategories(initialCategories);
        // Mark that we've initialized categories to prevent future runs when the combobox changes and causes a re-render
        setCategoriesInitialized(true);
      }
    }
  }, [parentCategories, existingCategories, categoriesInitialized]);

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
              setSelectedCategories(selectedValues ?? []);
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />

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
