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
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { mapValues } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  SavedObjectRecord,
  processImportResponse,
  ProcessedImportResponse,
} from 'ui/management/saved_objects_management';
import { ImportResponse } from 'src/core/server/saved_objects/import/types';
import { useKibanaSpaces } from '../../../../lib/hooks';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { ProcessingCopyToSpace } from './processing_copy_to_space';

interface Props {
  onClose: () => void;
  object: SavedObjectRecord;
}

export const CopyToSpaceFlyout = ({ onClose, object }: Props) => {
  const [includeRelated, setIncludeRelated] = useState(true);
  const [overwrite, setOverwrite] = useState(true);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);

  const spaces = useKibanaSpaces();

  const isLoading = spaces.length === 0;

  const [copyInProgress, setCopyInProgress] = useState(false);
  const [copyResult, setCopyResult] = useState<Record<string, ProcessedImportResponse>>({});

  useEffect(
    () => {
      if (copyInProgress) {
        // simulating copy operation
        setTimeout(() => {
          const dummyResponse = selectedSpaceIds.reduce<Record<string, ImportResponse>>(
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
                          type: object.type,
                          id: object.id,
                          error: {
                            type: overwrite ? 'missing_references' : 'conflict',
                            references: [],
                          },
                        },
                      ]
                    : undefined,
                } as ImportResponse,
              };
            },
            {}
          );

          const processedResult = mapValues(dummyResponse, processImportResponse);
          setCopyResult(processedResult);
          const inProgress = Object.values(processedResult).some(
            res => res.failedImports.length > 0
          );
          setCopyInProgress(inProgress);
        }, 5000);
      }
    },
    [copyInProgress]
  );

  function startCopy() {
    setCopyInProgress(true);
    setCopyResult({});
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

      <EuiSpacer />

      {!isLoading && (
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.selectSpacesLabel"
              defaultMessage="Select spaces to copy into"
            />
          }
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
    <EuiFlyout onClose={onClose} maxWidth={400}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <EuiIcon size="m" type="spacesApp" />
            &nbsp; &nbsp;
            <FormattedMessage
              id="xpack.spaces.management.copyToSpaceFlyoutHeader"
              defaultMessage="Copy saved object to space"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <EuiIcon type={object.meta.icon || 'apps'} /> {object.meta.title}
        </EuiText>

        <EuiSpacer />

        {copyInProgress && (
          <ProcessingCopyToSpace
            copyInProgress={copyInProgress}
            copyResult={copyResult}
            spaces={spaces}
            selectedSpaceIds={selectedSpaceIds}
          />
        )}
        {!copyInProgress && form}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={copyInProgress}
              onClick={() => startCopy()}
              data-test-subj="initiateCopyToSpacesButton"
              disabled={selectedSpaceIds.length === 0 || copyInProgress}
            >
              {selectedSpaceIds.length > 0 ? (
                <FormattedMessage
                  id="xpack.spaces.management.copyToSpace.copyToSpacesButton"
                  defaultMessage="Copy to {spaceCount} {spaceCount, plural, one {space} other {spaces}}"
                  values={{ spaceCount: selectedSpaceIds.length }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.spaces.management.copyToSpace.disabledCopyToSpacesButton"
                  defaultMessage="Copy"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
