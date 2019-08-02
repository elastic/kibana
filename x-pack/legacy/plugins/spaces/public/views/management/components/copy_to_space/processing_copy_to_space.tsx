/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ProcessedImportResponse, SavedObjectRecord } from 'ui/management/saved_objects_management';
import { SpaceAvatar } from 'plugins/spaces/components';
import { SavedObjectsImportRetry } from 'src/core/server/saved_objects/import/types';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiListGroup,
  EuiListGroupItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { summarizeCopyResult } from 'plugins/spaces/lib/copy_to_space';
import { FormattedMessage } from '@kbn/i18n/react';
import { Space } from '../../../../../common/model/space';
import { CopyStatusSummaryIndicator } from './copy_status_summary_indicator';
import { CopyResultDetails } from './copy_result_details';

interface Props {
  savedObject: SavedObjectRecord;
  copyInProgress: boolean;
  conflictResolutionInProgress: boolean;
  copyResult: Record<string, ProcessedImportResponse>;
  retries: Record<string, SavedObjectsImportRetry[]>;
  onRetriesChange: (retries: Record<string, SavedObjectsImportRetry[]>) => void;
  spaces: Space[];
  selectedSpaceIds: string[];
  includeRelated: boolean;
  overwrite: boolean;
}

export const ProcessingCopyToSpace = (props: Props) => {
  function updateRetries(spaceId: string, updatedRetries: SavedObjectsImportRetry[]) {
    props.onRetriesChange({
      ...props.retries,
      [spaceId]: updatedRetries,
    });
  }

  return (
    <Fragment>
      <EuiListGroup className="spcCopyToSpaceOptionsView" flush>
        <EuiListGroupItem
          iconType={props.includeRelated ? 'check' : 'cross'}
          label={
            props.includeRelated ? (
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
          iconType={props.overwrite ? 'check' : 'cross'}
          label={
            props.overwrite ? (
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
        <h5>Copy results</h5>
      </EuiText>
      <EuiSpacer size="m" />
      {props.selectedSpaceIds.map(id => {
        const space = props.spaces.find(s => s.id === id) as Space;
        const result = props.copyResult[space.id];
        const summarizedCopyResult = summarizeCopyResult(
          props.savedObject,
          result,
          props.includeRelated
        );

        const spaceHasPendingOverwrites = (props.retries[space.id] || []).some(r => r.overwrite);

        return (
          <Fragment>
            <EuiAccordion
              id={`copyToSpace-${id}`}
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
                  summarizedCopyResult={summarizedCopyResult}
                  conflictResolutionInProgress={
                    props.conflictResolutionInProgress && spaceHasPendingOverwrites
                  }
                />
              }
            >
              <EuiSpacer size="s" />
              <CopyResultDetails
                savedObject={props.savedObject}
                summarizedCopyResult={summarizedCopyResult}
                space={space}
                retries={props.retries[space.id] || []}
                onRetriesChange={updatedRetries => updateRetries(space.id, updatedRetries)}
                conflictResolutionInProgress={
                  props.conflictResolutionInProgress && spaceHasPendingOverwrites
                }
              />
            </EuiAccordion>
            <EuiSpacer size="s" />
          </Fragment>
        );
      })}
    </Fragment>
  );
};
