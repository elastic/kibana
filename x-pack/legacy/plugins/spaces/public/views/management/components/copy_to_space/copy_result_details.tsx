/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ProcessedImportResponse } from 'ui/management/saved_objects_management';
import { summarizeCopyResult } from 'plugins/spaces/lib/copy_to_space';
import { EuiCallOut, EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { SavedObjectsImportRetry } from 'src/core/server/saved_objects/import/types';
import { Space } from '../../../../../common/model/space';

interface Props {
  copyResult: ProcessedImportResponse;
  space: Space;
  retries: SavedObjectsImportRetry[];
  onRetriesChange: (retries: SavedObjectsImportRetry[]) => void;
}
type RetryOperation = 'overwrite' | 'skip';

export const CopyResultDetails = (props: Props) => {
  const { successful, hasConflicts, conflicts, hasUnresolvableErrors } = summarizeCopyResult(
    props.copyResult
  );

  if (successful) {
    return null;
  }

  if (hasUnresolvableErrors) {
    return (
      <EuiCallOut
        color="danger"
        iconType="cross"
        size="s"
        title={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyDetail.unresolvableCallout"
            defaultMessage="Unable to copy to space"
          />
        }
      />
    );
  }

  if (hasConflicts) {
    return (
      <div>
        <EuiCallOut
          color="warning"
          iconType="alert"
          size="s"
          title={
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.copyDetail.conflictCallout"
              defaultMessage="Choose how to resolve conflicts below"
            />
          }
        />
        {conflicts.map(({ obj }) => {
          const retry = props.retries.find(r => r.id === obj.id);
          return (
            <EuiFormRow
              compressed
              label={
                <span>
                  {obj.title || obj.id} ({obj.type})
                </span>
              }
            >
              <EuiButtonGroup
                type="single"
                idSelected={
                  retry && retry.overwrite
                    ? operationToId('overwrite', obj.id)
                    : operationToId('skip', obj.id)
                }
                options={[
                  {
                    id: operationToId('overwrite', obj.id),
                    label: i18n.translate(
                      'xpack.spaces.management.copyToSpace.copyDetail.overwriteLabel',
                      { defaultMessage: 'Overwrite' }
                    ),
                  },
                  {
                    id: operationToId('skip', obj.id),
                    label: i18n.translate(
                      'xpack.spaces.management.copyToSpace.copyDetail.skipLabel',
                      { defaultMessage: 'Skip' }
                    ),
                  },
                ]}
                onChange={id =>
                  props.onRetriesChange([
                    ...props.retries.filter(r => r.id !== obj.id),
                    {
                      id: obj.id,
                      type: obj.type,
                      overwrite: idToOperation(id) === 'overwrite',
                      replaceReferences: [],
                    },
                  ])
                }
              />
            </EuiFormRow>
          );
        })}
      </div>
    );
  }
  return null;
};

function idToOperation(id: string): RetryOperation {
  return id.split('__', 1)[0] as RetryOperation;
}

function operationToId(operation: RetryOperation, objectId: string): string {
  return `${operation}__${objectId}`;
}
