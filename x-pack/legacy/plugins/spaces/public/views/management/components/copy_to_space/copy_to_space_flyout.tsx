/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect, Fragment } from 'react';
import {
  EuiFlyout,
  EuiIcon,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiFlyoutBody,
  EuiSpacer,
  EuiSwitch,
  EuiFormRow,
  EuiFlyoutFooter,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  SavedObjectRecord,
  processImportResponse,
  ProcessedImportResponse,
} from 'ui/management/saved_objects_management';
import {
  SavedObjectsImportResponse,
  SavedObjectsImportRetry,
} from 'src/core/server/saved_objects/import/types';
import { toastNotifications } from 'ui/notify';
import { useKibanaSpaces } from '../../../../lib/hooks';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { ProcessingCopyToSpace } from './processing_copy_to_space';
import { CopyToSpaceFlyoutFooter } from './copy_to_space_flyout_footer';

interface Props {
  onClose: () => void;
  savedObject: SavedObjectRecord;
}

export const CopyToSpaceFlyout = ({ onClose, savedObject }: Props) => {
  const [includeRelated, setIncludeRelated] = useState(true);
  const [overwrite, setOverwrite] = useState(true);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);

  const spaces = useKibanaSpaces();

  const isLoading = spaces.length === 0;

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
        const dummyResponse = selectedSpaceIds.reduce<Record<string, SavedObjectsImportResponse>>(
          (acc, id) => {
            const successCount = Math.floor(Math.random() * 10);
            const hasErrors = successCount % 2 === 0;
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
                          type: overwrite ? 'missing_references' : 'conflict',
                          references: [],
                        },
                      },
                    ]
                  : undefined,
              } as SavedObjectsImportResponse,
            };
          },
          {}
        );

        const processedResult = mapValues(dummyResponse, processImportResponse);
        setCopyResult(processedResult);
        const inProgress = Object.values(processedResult).some(res => res.failedImports.length > 0);
        setCopyInProgress(inProgress);
      }, 5000);
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

        const dummyResponse = selectedSpaceIds.reduce<Record<string, SavedObjectsImportResponse>>(
          (acc, id) => {
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
                          type: overwrite ? 'missing_references' : 'conflict',
                          references: [],
                        },
                      },
                    ]
                  : undefined,
              } as SavedObjectsImportResponse,
            };
          },
          {}
        );

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
      }, 5000);
    } else {
      toastNotifications.addSuccess(
        i18n.translate('xpack.spaces.management.copyToSpace.copySuccess', {
          defaultMessage: 'Copy successful',
        })
      );
      onClose();
    }
  }

  const form = (
    <Fragment>
      <EuiSwitch
        label={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.includeRelatedObjects"
            defaultMessage="Include related objects"
          />
        }
        checked={includeRelated}
        onChange={e => setIncludeRelated(e.target.checked)}
        disabled={copyInProgress}
      />

      <EuiSpacer />

      <EuiSwitch
        label={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.automaticallyOverwrite"
            defaultMessage="Automatically overwrite all saved objects"
          />
        }
        checked={overwrite}
        onChange={e => setOverwrite(e.target.checked)}
        disabled={copyInProgress}
      />

      <EuiHorizontalRule margin="m" />

      {/* TODO: remove once https://github.com/elastic/eui/issues/2071 is fixed */}
      {isLoading && <EuiLoadingSpinner />}

      {!isLoading && (
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.selectSpacesLabel"
              defaultMessage="Select spaces to copy into"
            />
          }
          fullWidth
        >
          <SelectableSpacesControl
            spaces={spaces}
            selectedSpaceIds={selectedSpaceIds}
            onChange={selection => setSelectedSpaceIds(selection)}
            disabled={copyInProgress}
          />
        </EuiFormRow>
      )}
    </Fragment>
  );

  return (
    <EuiFlyout onClose={onClose} maxWidth={600}>
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
        {copyInProgress && (
          <ProcessingCopyToSpace
            savedObject={savedObject}
            copyInProgress={copyInProgress}
            conflictResolutionInProgress={conflictResolutionInProgress}
            copyResult={copyResult}
            spaces={spaces}
            selectedSpaceIds={selectedSpaceIds}
            retries={retries}
            onRetriesChange={onRetriesChange}
            includeRelated={includeRelated}
            overwrite={overwrite}
          />
        )}
        {!copyInProgress && form}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <CopyToSpaceFlyoutFooter
          copyInProgress={copyInProgress}
          conflictResolutionInProgress={conflictResolutionInProgress}
          initialCopyFinished={initialCopyFinished}
          copyResult={copyResult}
          numberOfSelectedSpaces={selectedSpaceIds.length}
          retries={retries}
          onCopyStart={startCopy}
          onCopyFinish={finishCopy}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
