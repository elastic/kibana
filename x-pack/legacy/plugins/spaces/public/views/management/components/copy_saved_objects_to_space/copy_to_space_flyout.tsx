/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
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
import { SavedObjectsImportRetry } from 'src/core/server';
import { toastNotifications } from 'ui/notify';
import { Space } from '../../../../../common/model/space';
import { SpacesManager } from '../../../../lib';
import { useKibanaSpaces } from '../../../../lib/hooks';
import { ProcessingCopyToSpace } from './processing_copy_to_space';
import { CopyToSpaceFlyoutFooter } from './copy_to_space_flyout_footer';
import { CopyToSpaceForm } from './copy_to_space_form';
import { CopyOptions } from './types';

interface Props {
  onClose: () => void;
  savedObject: SavedObjectRecord;
  spacesManager: SpacesManager;
  activeSpace: Space;
}

export const CopySavedObjectsToSpaceFlyout = (props: Props) => {
  const { onClose, savedObject, spacesManager } = props;
  const [copyOptions, setCopyOptions] = useState<CopyOptions>({
    includeRelated: true,
    overwrite: true,
    selectedSpaceIds: [],
  });

  const { isLoading, spaces } = useKibanaSpaces('copySavedObjects');
  const eligibleSpaces = spaces.filter(space => space.id !== props.activeSpace.id);

  const [copyInProgress, setCopyInProgress] = useState(false);
  const [conflictResolutionInProgress, setConflictResolutionInProgress] = useState(false);
  const [copyResult, setCopyResult] = useState<Record<string, ProcessedImportResponse>>({});
  const [retries, setRetries] = useState<Record<string, SavedObjectsImportRetry[]>>({});

  const initialCopyFinished = Object.values(copyResult).length > 0;

  const onRetriesChange = (updatedRetries: Record<string, SavedObjectsImportRetry[]>) => {
    setRetries(updatedRetries);
  };

  async function startCopy() {
    setCopyInProgress(true);
    setCopyResult({});
    try {
      const copySavedObjectsResult = await spacesManager.copySavedObjects(
        [props.savedObject],
        copyOptions.selectedSpaceIds,
        copyOptions.includeRelated,
        copyOptions.overwrite
      );
      const processedResult = mapValues(copySavedObjectsResult, processImportResponse);
      setCopyResult(processedResult);
    } catch (e) {
      setCopyInProgress(false);
      toastNotifications.addError(e, {
        title: i18n.translate('xpack.spaces.management.copyToSpace.copyErrorTitle', {
          defaultMessage: 'Error copying saved object',
        }),
      });
    }
  }

  async function finishCopy() {
    const needsConflictResolution = Object.values(retries).some(spaceRetry =>
      spaceRetry.some(retry => retry.overwrite)
    );
    if (needsConflictResolution) {
      setConflictResolutionInProgress(true);
      try {
        const resolveCopySavedObjectsErrorsResult = await spacesManager.resolveCopySavedObjectsErrors(
          [props.savedObject],
          retries,
          copyOptions.includeRelated
        );
        console.log({ resolveCopySavedObjectsErrorsResult });
      } catch (e) {
        setCopyInProgress(false);
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.spaces.management.copyToSpace.resolveCopyErrorTitle', {
            defaultMessage: 'Error resolving saved object conflicts',
          }),
        });
      }
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
    if (eligibleSpaces.length === 0) {
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
        <CopyToSpaceForm
          spaces={eligibleSpaces}
          copyOptions={copyOptions}
          onUpdate={setCopyOptions}
        />
      );
    }

    // Step3: Copy operation is in progress
    return (
      <ProcessingCopyToSpace
        savedObject={savedObject}
        copyInProgress={copyInProgress}
        conflictResolutionInProgress={conflictResolutionInProgress}
        copyResult={copyResult}
        spaces={eligibleSpaces}
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
