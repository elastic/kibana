/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ProcessedImportResponse, SavedObjectRecord } from 'ui/management/saved_objects_management';
import {
  summarizeCopyResult,
  SummarizedCopyToSpaceResponse,
} from 'plugins/spaces/lib/copy_to_space';
import {
  EuiCallOut,
  EuiButtonGroup,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { SavedObjectsImportRetry } from 'src/core/server/saved_objects/import/types';
import { Space } from '../../../../../common/model/space';
import { CopyStatusIndicator } from './copy_status_indicator';

interface Props {
  savedObject: SavedObjectRecord;
  copyResult: ProcessedImportResponse;
  summarizedCopyResult: SummarizedCopyToSpaceResponse;
  space: Space;
  retries: SavedObjectsImportRetry[];
  onRetriesChange: (retries: SavedObjectsImportRetry[]) => void;
}
type RetryOperation = 'overwrite' | 'skip';

export const CopyResultDetails = (props: Props) => {
  const { successful, hasConflicts, objects, hasUnresolvableErrors } = summarizeCopyResult(
    props.savedObject,
    props.copyResult
  );

  const onOverwriteClick = (object: { type: string; id: string }) => {
    const retry = props.retries.find(r => r.type === object.type && r.id === object.id);

    props.onRetriesChange([
      ...props.retries.filter(r => r.type !== object.type && r.id !== object.id),
      {
        type: object.type,
        id: object.id,
        overwrite: retry ? !retry.overwrite : true,
        replaceReferences: [],
      },
    ]);
  };

  const hasPendingOverwrite = (object: { type: string; id: string }) => {
    const retry = props.retries.find(r => r.type === object.type && r.id === object.id);

    return retry && retry.overwrite;
  };

  return (
    <div style={{ paddingLeft: '24px', backgroundColor: '#f4f7fa' }}>
      {objects.map((object, index) => {
        const objectOverwritePending = hasPendingOverwrite(object);
        return (
          <EuiFlexGroup
            responsive={false}
            key={index}
            alignItems="center"
            style={{ width: '100%' }}
            gutterSize="s"
          >
            <EuiFlexItem grow={3}>
              <EuiText>
                <p className="eui-textTruncate">
                  {object.type}: {object.name || object.id}
                </p>
              </EuiText>
            </EuiFlexItem>
            {object.conflicts.length > 0 && !objectOverwritePending && (
              <EuiFlexItem grow={1}>
                <EuiText>
                  <EuiButtonEmpty onClick={() => onOverwriteClick(object)} size="xs">
                    <FormattedMessage
                      id="xpack.spaces.management.copyToSpace.copyDetail.overwriteButton"
                      defaultMessage="Overwrite"
                    />
                  </EuiButtonEmpty>
                </EuiText>
              </EuiFlexItem>
            )}
            {objectOverwritePending && (
              <EuiFlexItem grow={1}>
                <EuiText>
                  <EuiButtonEmpty onClick={() => onOverwriteClick(object)} size="xs">
                    <FormattedMessage
                      id="xpack.spaces.management.copyToSpace.copyDetail.skipOverwriteButton"
                      defaultMessage="Skip"
                    />
                  </EuiButtonEmpty>
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem style={{ marginRight: 0 }} grow={1}>
              <div className="eui-textRight">
                <CopyStatusIndicator
                  summarizedCopyResult={props.summarizedCopyResult}
                  object={object}
                  overwritePending={hasPendingOverwrite(object)}
                />
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </div>
  );

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
        <EuiSpacer size="s" />
        {conflicts.map(({ obj }) => {
          const retry = props.retries.find(r => r.id === obj.id);
          return (
            <EuiFormRow
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
