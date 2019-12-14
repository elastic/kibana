/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiListGroup,
  EuiListGroupItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { SavedObjectsManagementRecord } from '../../../../../../../../../src/legacy/core_plugins/management/public';
import { ProcessedImportResponse } from '../../../../../../../../../src/legacy/core_plugins/management/public';
import { summarizeCopyResult } from '../../../../lib/copy_saved_objects_to_space';
import { Space } from '../../../../../common/model/space';
import { CopyOptions, ImportRetry } from '../../../../lib/copy_saved_objects_to_space/types';
import { SpaceResult } from './space_result';

interface Props {
  savedObject: SavedObjectsManagementRecord;
  copyInProgress: boolean;
  conflictResolutionInProgress: boolean;
  copyResult: Record<string, ProcessedImportResponse>;
  retries: Record<string, ImportRetry[]>;
  onRetriesChange: (retries: Record<string, ImportRetry[]>) => void;
  spaces: Space[];
  copyOptions: CopyOptions;
}

export const ProcessingCopyToSpace = (props: Props) => {
  function updateRetries(spaceId: string, updatedRetries: ImportRetry[]) {
    props.onRetriesChange({
      ...props.retries,
      [spaceId]: updatedRetries,
    });
  }

  return (
    <div data-test-subj="copy-to-space-processing">
      <EuiListGroup className="spcCopyToSpaceOptionsView" flush>
        <EuiListGroupItem
          iconType={props.copyOptions.includeRelated ? 'check' : 'cross'}
          label={
            props.copyOptions.includeRelated ? (
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.includeRelatedLabel"
                defaultMessage="Including related saved objects"
              />
            ) : (
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.dontIncludeRelatedLabel"
                defaultMessage="Not including related saved objects"
              />
            )
          }
        />
        <EuiListGroupItem
          iconType={props.copyOptions.overwrite ? 'check' : 'cross'}
          label={
            props.copyOptions.overwrite ? (
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.overwriteLabel"
                defaultMessage="Automatically overwriting saved objects"
              />
            ) : (
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.dontOverwriteLabel"
                defaultMessage="Not overwriting saved objects"
              />
            )
          }
        />
      </EuiListGroup>
      <EuiHorizontalRule margin="m" />
      <EuiText size="s">
        <h5>
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyResultsLabel"
            defaultMessage="Copy results"
          />
        </h5>
      </EuiText>
      <EuiSpacer size="m" />
      {props.copyOptions.selectedSpaceIds.map(id => {
        const space = props.spaces.find(s => s.id === id) as Space;
        const spaceCopyResult = props.copyResult[space.id];
        const summarizedSpaceCopyResult = summarizeCopyResult(
          props.savedObject,
          spaceCopyResult,
          props.copyOptions.includeRelated
        );

        return (
          <Fragment key={id}>
            <SpaceResult
              savedObject={props.savedObject}
              space={space}
              summarizedCopyResult={summarizedSpaceCopyResult}
              retries={props.retries[space.id] || []}
              onRetriesChange={retries => updateRetries(space.id, retries)}
              conflictResolutionInProgress={props.conflictResolutionInProgress}
            />
            <EuiSpacer size="s" />
          </Fragment>
        );
      })}
    </div>
  );
};
