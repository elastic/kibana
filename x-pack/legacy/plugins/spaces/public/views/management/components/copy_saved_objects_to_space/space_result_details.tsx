/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummarizedCopyToSpaceResult } from 'plugins/spaces/lib/copy_saved_objects_to_space';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { SavedObjectsManagementRecord } from '../../../../../../../../../src/legacy/core_plugins/management/public';
import { Space } from '../../../../../common/model/space';
import { CopyStatusIndicator } from './copy_status_indicator';
import { ImportRetry } from '../../../../lib/copy_saved_objects_to_space/types';

interface Props {
  savedObject: SavedObjectsManagementRecord;
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  space: Space;
  retries: ImportRetry[];
  onRetriesChange: (retries: ImportRetry[]) => void;
  conflictResolutionInProgress: boolean;
}

export const SpaceCopyResultDetails = (props: Props) => {
  const onOverwriteClick = (object: { type: string; id: string }) => {
    const retry = props.retries.find(r => r.type === object.type && r.id === object.id);

    props.onRetriesChange([
      ...props.retries.filter(r => r !== retry),
      {
        type: object.type,
        id: object.id,
        overwrite: retry ? !retry.overwrite : true,
      },
    ]);
  };

  const hasPendingOverwrite = (object: { type: string; id: string }) => {
    const retry = props.retries.find(r => r.type === object.type && r.id === object.id);

    return Boolean(retry && retry.overwrite);
  };

  const { objects } = props.summarizedCopyResult;

  return (
    <div className="spcCopyToSpaceResultDetails">
      {objects.map((object, index) => {
        const objectOverwritePending = hasPendingOverwrite(object);

        const showOverwriteButton =
          object.conflicts.length > 0 &&
          !objectOverwritePending &&
          !props.conflictResolutionInProgress;

        const showSkipButton =
          !showOverwriteButton && objectOverwritePending && !props.conflictResolutionInProgress;

        return (
          <EuiFlexGroup
            responsive={false}
            key={index}
            alignItems="center"
            gutterSize="s"
            className="spcCopyToSpaceResultDetails__row"
          >
            <EuiFlexItem grow={5} className="spcCopyToSpaceResultDetails__savedObjectName">
              <EuiText size="s">
                <p className="eui-textTruncate" title={object.name || object.id}>
                  {object.type}: {object.name || object.id}
                </p>
              </EuiText>
            </EuiFlexItem>
            {showOverwriteButton && (
              <EuiFlexItem grow={1}>
                <EuiText size="s">
                  <EuiButtonEmpty
                    onClick={() => onOverwriteClick(object)}
                    size="xs"
                    data-test-subj={`cts-overwrite-conflict-${object.id}`}
                  >
                    <FormattedMessage
                      id="xpack.spaces.management.copyToSpace.copyDetail.overwriteButton"
                      defaultMessage="Overwrite"
                    />
                  </EuiButtonEmpty>
                </EuiText>
              </EuiFlexItem>
            )}
            {showSkipButton && (
              <EuiFlexItem grow={1}>
                <EuiText size="s">
                  <EuiButtonEmpty
                    onClick={() => onOverwriteClick(object)}
                    size="xs"
                    data-test-subj={`cts-skip-conflict-${object.id}`}
                  >
                    <FormattedMessage
                      id="xpack.spaces.management.copyToSpace.copyDetail.skipOverwriteButton"
                      defaultMessage="Skip"
                    />
                  </EuiButtonEmpty>
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem className="spcCopyToSpaceResultDetails__statusIndicator" grow={1}>
              <div className="eui-textRight">
                <CopyStatusIndicator
                  summarizedCopyResult={props.summarizedCopyResult}
                  object={object}
                  overwritePending={hasPendingOverwrite(object)}
                  conflictResolutionInProgress={
                    props.conflictResolutionInProgress && objectOverwritePending
                  }
                />
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </div>
  );
};
