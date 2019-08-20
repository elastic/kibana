/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import {
  EuiFlyout,
  EuiIcon,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  SavedObjectRecord,
  processImportResponse,
  ProcessedImportResponse,
} from 'ui/management/saved_objects_management';
import { SavedObjectsImportResponse, SavedObjectsImportRetry } from 'src/core/server';
import { toastNotifications } from 'ui/notify';
import { useKibanaSpaces } from '../../../../lib/hooks';
import { ProcessingCopyToSpace } from './processing_copy_to_space';
import { CopyToSpaceFlyoutFooter } from './copy_to_space_flyout_footer';
import { CopyToSpaceForm } from './copy_to_space_form';
import { CopyOptions } from './types';

interface Props {
  onClose: () => void;
  savedObject: SavedObjectRecord;
}

export const CopySavedObjectsToSpaceFlyout = ({ onClose, savedObject }: Props) => {
  const [copyOptions, setCopyOptions] = useState<CopyOptions>({
    includeRelated: true,
    overwrite: true,
    selectedSpaceIds: [],
  });

  const { isLoading, spaces } = useKibanaSpaces();

  const [copyInProgress, setCopyInProgress] = useState(false);
  const [conflictResolutionInProgress, setConflictResolutionInProgress] = useState(false);
  const [copyResult, setCopyResult] = useState<Record<string, ProcessedImportResponse>>({});
  const [retries, setRetries] = useState<Record<string, SavedObjectsImportRetry[]>>({});

  const initialCopyFinished = Object.values(copyResult).length > 0;

  const onRetriesChange = (updatedRetries: Record<string, SavedObjectsImportRetry[]>) => {
    setRetries(updatedRetries);
  };

  useEffect(() => {
    if (copyInProgress) {
      // simulating copy operation
      setTimeout(() => {
        const dummyResponse = copyOptions.selectedSpaceIds.reduce<
          Record<string, SavedObjectsImportResponse>
        >((acc, id) => {
          const successCount = 17;
          const hasErrors = id === 'sales';
          return {
            ...acc,
            [id]: {
              successCount,
              success: true,
              errors: hasErrors
                ? [
                    {
                      type: 'index-pattern',
                      id: 'logstash-*',
                      error: {
                        type: copyOptions.overwrite ? 'missing_references' : 'conflict',
                        references: [],
                      },
                    },
                  ]
                : undefined,
            } as SavedObjectsImportResponse,
          };
        }, {});

        const processedResult = mapValues(dummyResponse, processImportResponse);
        setCopyResult(processedResult);
      }, 1000);
    }
  }, [copyInProgress]);

  function startCopy() {
    setCopyInProgress(true);
    setCopyResult({});
  }

  function finishCopy() {
    const needsConflictResolution = Object.values(retries).some(spaceRetry =>
      spaceRetry.some(retry => retry.overwrite)
    );
    if (needsConflictResolution) {
      setConflictResolutionInProgress(true);
      // simulating conflict resolution operation
      setTimeout(() => {
        setConflictResolutionInProgress(false);

        const dummyResponse = copyOptions.selectedSpaceIds.reduce<
          Record<string, SavedObjectsImportResponse>
        >((acc, id) => {
          const successCount = Math.floor(Math.random() * 10);
          const hasErrors = false; // successCount % 2 === 0;
          return {
            ...acc,
            [id]: {
              successCount,
              success: true,
              errors: hasErrors
                ? [
                    {
                      type: savedObject.type,
                      id: savedObject.id,
                      error: {
                        type: copyOptions.overwrite ? 'missing_references' : 'conflict',
                        references: [],
                      },
                    },
                  ]
                : undefined,
            } as SavedObjectsImportResponse,
          };
        }, {});

        if (dummyResponse.success) {
          toastNotifications.addSuccess(
            i18n.translate('xpack.spaces.management.copyToSpace.copyWithConflictSuccess', {
              defaultMessage: 'Copy successful',
            })
          );
        } else {
          toastNotifications.addDanger(
            i18n.translate('xpack.spaces.management.copyToSpace.copyWithConflictError', {
              defaultMessage: 'Error resolving conflicts. Please try again.',
            })
          );
        }

        onClose();
      }, 1000);
    } else {
      toastNotifications.addSuccess(
        i18n.translate('xpack.spaces.management.copyToSpace.copySuccess', {
          defaultMessage: 'Copy successful',
        })
      );
      onClose();
    }
  }

  const getFlyoutBody = () => {
    // Step 1: loading assets for main form
    if (isLoading) {
      return <EuiLoadingSpinner />;
    }

    // Step 1a: assets loaded, but no spaces are available for copy.
    if (spaces.length === 0) {
      return (
        <EuiEmptyPrompt
          body={
            <p>
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.noSpacesBody"
                defaultMessage="There are no eligible spaces to copy into."
              />
            </p>
          }
          title={
            <h3>
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.noSpacesTitle"
                defaultMessage="No spaces available"
              />
            </h3>
          }
        />
      );
    }

    // Step 2: Copy has not been initiated yet; User must fill out form to continue.
    if (!copyInProgress) {
      return (
        <CopyToSpaceForm spaces={spaces} copyOptions={copyOptions} onUpdate={setCopyOptions} />
      );
    }

    // Step3: Copy operation is in progress
    return (
      <ProcessingCopyToSpace
        savedObject={savedObject}
        copyInProgress={copyInProgress}
        conflictResolutionInProgress={conflictResolutionInProgress}
        copyResult={copyResult}
        spaces={spaces}
        copyOptions={copyOptions}
        retries={retries}
        onRetriesChange={onRetriesChange}
      />
    );
  };

  return (
    <EuiFlyout onClose={onClose} maxWidth={600} data-test-subj="copy-to-space-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type="spacesApp" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.spaces.management.copyToSpaceFlyoutHeader"
                  defaultMessage="Copy saved object to space"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon type={savedObject.meta.icon || 'apps'} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>{savedObject.meta.title}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        {getFlyoutBody()}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <CopyToSpaceFlyoutFooter
          copyInProgress={copyInProgress}
          conflictResolutionInProgress={conflictResolutionInProgress}
          initialCopyFinished={initialCopyFinished}
          copyResult={copyResult}
          numberOfSelectedSpaces={copyOptions.selectedSpaceIds.length}
          retries={retries}
          onCopyStart={startCopy}
          onCopyFinish={finishCopy}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
