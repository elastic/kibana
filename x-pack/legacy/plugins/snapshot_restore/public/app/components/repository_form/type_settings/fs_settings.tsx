/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { FSRepository, Repository } from '../../../../../common/types';
import { useAppDependencies } from '../../../index';
import { RepositorySettingsValidation } from '../../../services/validation';
import { textService } from '../../../services/text';

interface Props {
  repository: FSRepository;
  updateRepositorySettings: (
    updatedSettings: Partial<Repository['settings']>,
    replaceSettings?: boolean
  ) => void;
  settingErrors: RepositorySettingsValidation;
}

export const FSSettings: React.FunctionComponent<Props> = ({
  repository,
  updateRepositorySettings,
  settingErrors,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const {
    settings: {
      location,
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
      {/* Location field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.locationTitle"
                defaultMessage="File system location"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <Fragment>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryFor.typeFS.locationDescription"
              defaultMessage="The location must be registered in the {settingKey} setting on all master and data nodes."
              values={{
                settingKey: <EuiCode>path.repo</EuiCode>,
              }}
            />
          </Fragment>
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeFS.locationLabel"
              defaultMessage="Location (required)"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.location)}
          error={settingErrors.location}
        >
          <EuiFieldText
            defaultValue={location || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                location: e.target.value,
              });
            }}
            data-test-subj="locationInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Compress field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.compressTitle"
                defaultMessage="Snapshot compression"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.compressDescription"
            defaultMessage="Compresses the index mapping and setting files for snapshots. Data files are not compressed."
          />
        }
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.compress)}
          error={settingErrors.compress}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.compressLabel"
                defaultMessage="Compress snapshots"
              />
            }
            checked={!!compress}
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
                id="xpack.snapshotRestore.repositoryForm.typeFS.chunkSizeTitle"
                defaultMessage="Chunk size"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.chunkSizeDescription"
            defaultMessage="Breaks files into smaller units when taking snapshots."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeFS.chunkSizeLabel"
              defaultMessage="Chunk size"
            />
          }
          fullWidth
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
                id="xpack.snapshotRestore.repositoryForm.typeFS.maxSnapshotBytesTitle"
                defaultMessage="Max snapshot bytes per second"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.maxSnapshotBytesDescription"
            defaultMessage="The rate for creating snapshots for each node."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeFS.maxSnapshotBytesLabel"
              defaultMessage="Max snapshot bytes per second"
            />
          }
          fullWidth
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
                id="xpack.snapshotRestore.repositoryForm.typeFS.maxRestoreBytesTitle"
                defaultMessage="Max restore bytes per second"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.maxRestoreBytesDescription"
            defaultMessage="The snapshot restore rate for each node."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeFS.maxRestoreBytesLabel"
              defaultMessage="Max restore bytes per second"
            />
          }
          fullWidth
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
                id="xpack.snapshotRestore.repositoryForm.typeFS.readonlyTitle"
                defaultMessage="Read-only"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.readonlyDescription"
            defaultMessage="Only one cluster should have write access to this repository. All other clusters should be read-only."
          />
        }
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.readonly)}
          error={settingErrors.readonly}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.readonlyLabel"
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
