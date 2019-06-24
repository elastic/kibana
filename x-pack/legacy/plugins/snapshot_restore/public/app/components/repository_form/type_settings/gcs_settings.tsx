/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiDescribedFormGroup, EuiFieldText, EuiFormRow, EuiSwitch, EuiTitle } from '@elastic/eui';
import { GCSRepository, Repository } from '../../../../../common/types';
import { useAppDependencies } from '../../../index';
import { RepositorySettingsValidation } from '../../../services/validation';
import { textService } from '../../../services/text';

interface Props {
  repository: GCSRepository;
  updateRepositorySettings: (
    updatedSettings: Partial<Repository['settings']>,
    replaceSettings?: boolean
  ) => void;
  settingErrors: RepositorySettingsValidation;
}

export const GCSSettings: React.FunctionComponent<Props> = ({
  repository,
  updateRepositorySettings,
  settingErrors,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
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
  const hasErrors: boolean = Boolean(Object.keys(settingErrors).length);

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
        idAria="gcsRepositoryClientDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeGCS.clientLabel"
              defaultMessage="Client"
            />
          }
          fullWidth
          describedByIds={['gcsRepositoryClientDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.client)}
          error={settingErrors.client}
        >
          <EuiFieldText
            defaultValue={client || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                client: e.target.value,
              });
            }}
            data-test-subj="clientInput"
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
        idAria="gcsRepositoryBucketDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeGCS.bucketLabel"
              defaultMessage="Bucket (required)"
            />
          }
          fullWidth
          describedByIds={['gcsRepositoryBucketDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.bucket)}
          error={settingErrors.bucket}
        >
          <EuiFieldText
            defaultValue={bucket || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                bucket: e.target.value,
              });
            }}
            data-test-subj="bucketInput"
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
        idAria="gcsRepositoryBasePathDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeGCS.basePathLabel"
              defaultMessage="Base path"
            />
          }
          fullWidth
          describedByIds={['gcsRepositoryBasePathDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.basePath)}
          error={settingErrors.basePath}
        >
          <EuiFieldText
            defaultValue={basePath || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                basePath: e.target.value,
              });
            }}
            data-test-subj="basePathInput"
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
        idAria="gcsRepositoryCompressDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['gcsRepositoryCompressDescription']}
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
            onChange={e => {
              updateRepositorySettings({
                compress: e.target.checked,
              });
            }}
            data-test-subj="compressToggle"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Chunk size field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.chunkSizeTitle"
                defaultMessage="Chunk size"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeGCS.chunkSizeDescription"
            defaultMessage="Breaks files into smaller units when taking snapshots."
          />
        }
        idAria="gcsRepositoryChunkSizeDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeGCS.chunkSizeLabel"
              defaultMessage="Chunk size"
            />
          }
          fullWidth
          describedByIds={['gcsRepositoryChunkSizeDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.chunkSize)}
          error={settingErrors.chunkSize}
          helpText={textService.getSizeNotationHelpText()}
        >
          <EuiFieldText
            defaultValue={chunkSize || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                chunkSize: e.target.value,
              });
            }}
            data-test-subj="chunkSizeInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Max snapshot bytes field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.maxSnapshotBytesTitle"
                defaultMessage="Max snapshot bytes per second"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeGCS.maxSnapshotBytesDescription"
            defaultMessage="The rate for creating snapshots for each node."
          />
        }
        idAria="gcsRepositoryMaxSnapshotBytesDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeGCS.maxSnapshotBytesLabel"
              defaultMessage="Max snapshot bytes per second"
            />
          }
          fullWidth
          describedByIds={['gcsRepositoryMaxSnapshotBytesDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.maxSnapshotBytesPerSec)}
          error={settingErrors.maxSnapshotBytesPerSec}
          helpText={textService.getSizeNotationHelpText()}
        >
          <EuiFieldText
            defaultValue={maxSnapshotBytesPerSec || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                maxSnapshotBytesPerSec: e.target.value,
              });
            }}
            data-test-subj="maxSnapshotBytesInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Max restore bytes field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeGCS.maxRestoreBytesTitle"
                defaultMessage="Max restore bytes per second"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeGCS.maxRestoreBytesDescription"
            defaultMessage="The snapshot restore rate for each node."
          />
        }
        idAria="gcsRepositoryMaxRestoreBytesDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeGCS.maxRestoreBytesLabel"
              defaultMessage="Max restore bytes per second"
            />
          }
          fullWidth
          describedByIds={['gcsRepositoryMaxRestoreBytesDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.maxRestoreBytesPerSec)}
          error={settingErrors.maxRestoreBytesPerSec}
          helpText={textService.getSizeNotationHelpText()}
        >
          <EuiFieldText
            defaultValue={maxRestoreBytesPerSec || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                maxRestoreBytesPerSec: e.target.value,
              });
            }}
            data-test-subj="maxRestoreBytesInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

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
        idAria="gcsRepositoryReadonlyDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['gcsRepositoryReadonlyDescription']}
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
            onChange={e => {
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
