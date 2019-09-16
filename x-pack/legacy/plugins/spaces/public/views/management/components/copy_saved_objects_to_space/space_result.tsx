/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import { SavedObjectsManagementRecord } from '../../../../../../../../../src/legacy/core_plugins/management/public';
import { SummarizedCopyToSpaceResult } from '../../../../lib/copy_saved_objects_to_space';
import { SpaceAvatar } from '../../../../components';
import { Space } from '../../../../../common/model/space';
import { CopyStatusSummaryIndicator } from './copy_status_summary_indicator';
import { SpaceCopyResultDetails } from './space_result_details';
import { ImportRetry } from '../../../../lib/copy_saved_objects_to_space/types';

interface Props {
  savedObject: SavedObjectsManagementRecord;
  space: Space;
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  retries: ImportRetry[];
  onRetriesChange: (retries: ImportRetry[]) => void;
  conflictResolutionInProgress: boolean;
}

export const SpaceResult = (props: Props) => {
  const {
    space,
    summarizedCopyResult,
    retries,
    onRetriesChange,
    savedObject,
    conflictResolutionInProgress,
  } = props;
  const spaceHasPendingOverwrites = retries.some(r => r.overwrite);

  return (
    <EuiAccordion
      id={`copyToSpace-${space.id}`}
      data-test-subj={`cts-space-result-${space.id}`}
      className="spcCopyToSpaceResult"
      buttonContent={
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <SpaceAvatar space={space} size="s" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>{space.name}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <CopyStatusSummaryIndicator
          space={space}
          summarizedCopyResult={summarizedCopyResult}
          conflictResolutionInProgress={conflictResolutionInProgress && spaceHasPendingOverwrites}
        />
      }
    >
      <EuiSpacer size="s" />
      <SpaceCopyResultDetails
        savedObject={savedObject}
        summarizedCopyResult={summarizedCopyResult}
        space={space}
        retries={retries}
        onRetriesChange={onRetriesChange}
        conflictResolutionInProgress={conflictResolutionInProgress && spaceHasPendingOverwrites}
      />
    </EuiAccordion>
  );
};
