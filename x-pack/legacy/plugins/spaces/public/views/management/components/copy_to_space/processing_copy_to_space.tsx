/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ProcessedImportResponse } from 'ui/management/saved_objects_management';
import { SpaceAvatar } from 'plugins/spaces/components';
import { SavedObjectsImportRetry } from 'src/core/server/saved_objects/import/types';
import { Space } from '../../../../../common/model/space';
import { CopyStatusIndicator } from './copy_status_indicator';
import { CopyResultDetails } from './copy_result_details';

interface Props {
  copyInProgress: boolean;
  copyResult: Record<string, ProcessedImportResponse>;
  retries: Record<string, SavedObjectsImportRetry[]>;
  onRetriesChange: (retries: Record<string, SavedObjectsImportRetry[]>) => void;
  spaces: Space[];
  selectedSpaceIds: string[];
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
      <ul>
        {props.selectedSpaceIds.map(id => {
          const space = props.spaces.find(s => s.id === id) as Space;
          const result = props.copyResult[space.id];
          return (
            <li key={id} style={{ margin: '5px 0' }}>
              <div>
                <SpaceAvatar space={space} /> {space.name}:{' '}
                <CopyStatusIndicator copyResult={result} />
              </div>
              {result && (
                <CopyResultDetails
                  copyResult={result}
                  space={space}
                  retries={props.retries[space.id] || []}
                  onRetriesChange={updatedRetries => updateRetries(space.id, updatedRetries)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </Fragment>
  );
};
