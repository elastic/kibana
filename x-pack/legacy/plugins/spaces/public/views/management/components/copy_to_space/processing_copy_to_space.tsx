/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiLoadingSpinner, EuiText, EuiSpacer, EuiHealth } from '@elastic/eui';
import { ProcessedImportResponse } from 'ui/management/saved_objects_management';
import { FormattedMessage } from '@kbn/i18n/react';
import { SpaceAvatar } from 'plugins/spaces/components';
import { Space } from '../../../../../common/model/space';
import { CopyStatusIndicator } from './copy_status_indicator';

interface Props {
  copyInProgress: boolean;
  copyResult: Record<string, ProcessedImportResponse>;
  spaces: Space[];
  selectedSpaceIds: string[];
}

export const ProcessingCopyToSpace = (props: Props) => {
  return (
    <Fragment>
      <ul>
        {props.selectedSpaceIds.map(id => {
          const space = props.spaces.find(s => s.id === id) as Space;
          const result = props.copyResult[space.id];
          return (
            <li key={id} style={{ margin: '5px 0' }}>
              <SpaceAvatar space={space} /> {space.name}:{' '}
              <CopyStatusIndicator copyInProgress={!result} copyResult={result} />
            </li>
          );
        })}
      </ul>
    </Fragment>
  );
};
