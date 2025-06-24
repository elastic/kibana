/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { GCSRepository, Repository } from '../../../../../common/types';
import { RepositorySettingsValidation } from '../../../services/validation';
import { ChunkSizeField, MaxSnapshotsField, MaxRestoreField } from './common';
import { DisableToolTip, MANAGED_REPOSITORY_TOOLTIP_MESSAGE } from '../../disable_tooltip';

interface Props {
  repository: GCSRepository;
  isManagedRepository?: boolean;
  updateRepositorySettings: (
    updatedSettings: Partial<Repository['settings']>,
    replaceSettings?: boolean
  ) => void;
  settingErrors: RepositorySettingsValidation;
}

export const GCSSettings: React.FunctionComponent<Props> = ({
  repository,
  isManagedRepository,
  updateRepositorySettings,
  settingErrors,
}) => {
  const {
    settings: {
      bucket,
      client,
      basePath,
      compress,
      chunkSize,
      maxRestoreBytesPerSec,
      maxSnapshotBytesPerSec,
      readonly,
    },
  } = repository;
  const clientId = useGeneratedHtmlId({ prefix: 'gcsClientInput' });
  const bucketId = useGeneratedHtmlId({ prefix: 'gcsBucketInput' });
  const basePathId = useGeneratedHtmlId({ prefix: 'gcsBasePathInput' });
  const hasErrors: boolean = Boolean(Object.keys(settingErrors).length);

  const updateSettings = (name: string, value: string) => {
    updateRepositorySettings({
      [name]: value,
    });
  };

  return (
    <Fragment>
      {/* Client field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.clientTitle"
                defaultMessage="Client"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeGCS.clientDescription"
            defaultMessage="The name of the Google Cloud Storage client."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <span id={clientId}>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.clientLabel"
                defaultMessage="Client"
              />
            </span>
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.client)}
          error={settingErrors.client}
        >
          <DisableToolTip
            isManaged={isManagedRepository}
            tooltipMessage={MANAGED_REPOSITORY_TOOLTIP_MESSAGE}
            component={
              <EuiFieldText
                defaultValue={client || ''}
                fullWidth
                onChange={(e) => {
                  updateRepositorySettings({
                    client: e.target.value,
                  });
                }}
                data-test-subj="clientInput"
                disabled={isManagedRepository}
                aria-labelledby={clientId}
              />
            }
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Bucket field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.bucketTitle"
                defaultMessage="Bucket"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeGCS.bucketDescription"
            defaultMessage="The name of the Google Cloud Storage bucket to use for snapshots."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <span id={bucketId}>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.bucketLabel"
                defaultMessage="Bucket (required)"
              />
            </span>
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.bucket)}
          error={settingErrors.bucket}
        >
          <DisableToolTip
            isManaged={isManagedRepository}
            tooltipMessage={MANAGED_REPOSITORY_TOOLTIP_MESSAGE}
            component={
              <EuiFieldText
                defaultValue={bucket || ''}
                fullWidth
                onChange={(e) => {
                  updateRepositorySettings({
                    bucket: e.target.value,
                  });
                }}
                data-test-subj="bucketInput"
                disabled={isManagedRepository}
                aria-labelledby={bucketId}
              />
            }
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Base path field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.basePathTitle"
                defaultMessage="Base path"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeGCS.basePathDescription"
            defaultMessage="The bucket path to the repository data."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <span id={basePathId}>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.basePathLabel"
                defaultMessage="Base path"
              />
            </span>
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.basePath)}
          error={settingErrors.basePath}
        >
          <DisableToolTip
            isManaged={isManagedRepository}
            tooltipMessage={MANAGED_REPOSITORY_TOOLTIP_MESSAGE}
            component={
              <EuiFieldText
                defaultValue={basePath || ''}
                fullWidth
                onChange={(e) => {
                  updateRepositorySettings({
                    basePath: e.target.value,
                  });
                }}
                data-test-subj="basePathInput"
                disabled={isManagedRepository}
                aria-labelledby={basePathId}
              />
            }
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Compress field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.compressTitle"
                defaultMessage="Compress snapshots"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeGCS.compressDescription"
            defaultMessage="Compresses the index mapping and setting files for snapshots. Data files are not compressed."
          />
        }
        fullWidth
      >
        <EuiFormRow
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.compress)}
          error={settingErrors.compress}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.compressLabel"
                defaultMessage="Compress snapshots"
              />
            }
            checked={!(compress === false)}
            onChange={(e) => {
              updateRepositorySettings({
                compress: e.target.checked,
              });
            }}
            data-test-subj="compressToggle"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Chunk size field */}
      <ChunkSizeField
        isInvalid={Boolean(hasErrors && settingErrors.chunkSize)}
        error={settingErrors.chunkSize}
        defaultValue={chunkSize || ''}
        updateSettings={updateSettings}
      />

      {/* Max snapshot bytes field */}
      <MaxSnapshotsField
        isInvalid={Boolean(hasErrors && settingErrors.maxSnapshotBytesPerSec)}
        error={settingErrors.maxSnapshotBytesPerSec}
        defaultValue={maxSnapshotBytesPerSec || ''}
        updateSettings={updateSettings}
      />

      {/* Max restore bytes field */}
      <MaxRestoreField
        isInvalid={Boolean(hasErrors && settingErrors.maxRestoreBytesPerSec)}
        error={settingErrors.maxRestoreBytesPerSec}
        defaultValue={maxRestoreBytesPerSec || ''}
        updateSettings={updateSettings}
      />

      {/* Readonly field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.readonlyTitle"
                defaultMessage="Read-only"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeGCS.readonlyDescription"
            defaultMessage="Only one cluster should have write access to this repository. All other clusters should be read-only."
          />
        }
        fullWidth
      >
        <EuiFormRow
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.readonly)}
          error={settingErrors.readonly}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.readonlyLabel"
                defaultMessage="Read-only repository"
              />
            }
            checked={!!readonly}
            onChange={(e) => {
              updateRepositorySettings({
                readonly: e.target.checked,
              });
            }}
            data-test-subj="readOnlyToggle"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </Fragment>
  );
};
