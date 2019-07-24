/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';

import {
  EuiForm,
  EuiDescribedFormGroup,
  EuiTitle,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiLink,
} from '@elastic/eui';
import { SlmPolicyPayload, Repository } from '../../../../common/types';
import { useLoadRepositories } from '../../services/http';
import { linkToAddRepository } from '../../services/navigation';
import { documentationLinksService } from '../../services/documentation';
import { useAppDependencies } from '../../index';
import { SectionLoading, SectionError } from '../';

interface Props {
  policy: SlmPolicyPayload;
  currentUrl: string;
  isEditing?: boolean;
  isSaving: boolean;
  saveError?: React.ReactNode;
  clearSaveError: () => void;
  onCancel: () => void;
  onSave: (policy: SlmPolicyPayload) => void;
}

export const PolicyForm: React.FunctionComponent<Props> = ({
  policy: originalPolicy,
  currentUrl,
  isEditing,
  isSaving,
  saveError,
  clearSaveError,
  onCancel,
  onSave,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  // Poicy state
  const [policy, setPolicy] = useState<SlmPolicyPayload>({
    ...originalPolicy,
    config: {
      ...originalPolicy.config,
    },
  });

  const updatePolicy = (updatedFields: any): void => {
    const newPolicy = { ...policy, ...updatedFields };
    setPolicy(newPolicy);
  };

  // Load repositories for repository dropdown field
  const {
    error: errorLoadingRepositories,
    loading: isLoadingRepositories,
    data: { repositories } = {
      repositories: [],
    },
    request: reloadRepositories,
  } = useLoadRepositories();

  // Policy validation state
  const [validation, setValidation] = useState<any>({
    isValid: true,
    errors: {},
  });

  const { errors } = validation;

  const renderNameField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.fields.nameDescriptionTitle"
              defaultMessage="Policy name"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.fields.nameDescription"
          defaultMessage="A unique name for the policy."
        />
      }
      idAria="policyNameDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.fields.policyNameLabel"
            defaultMessage="Name"
          />
        }
        describedByIds={['policyNameDescription']}
        isInvalid={Boolean(errors.name)}
        error={errors.name}
        fullWidth
      >
        <EuiFieldText
          defaultValue={policy.name}
          fullWidth
          onChange={e => {
            updatePolicy({
              name: e.target.value,
            });
          }}
          placeholder={i18n.translate(
            'xpack.snapshotRestore.policyForm.fields.policyNamePlaceholder',
            {
              defaultMessage: 'daily-snapshots',
              description:
                'Example SLM policy name. Similar to index names, do not use spaces in translation.',
            }
          )}
          data-test-subj="nameInput"
          disabled={isEditing}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderRepositoryField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.fields.repositoryDescriptionTitle"
              defaultMessage="Repository"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.fields.repositoryDescription"
          defaultMessage="Repository to store snapshots taken by this policy."
        />
      }
      idAria="policyRepositoryDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.fields.policyRepositoryLabel"
            defaultMessage="Repository"
          />
        }
        describedByIds={['policyRepositoryDescription']}
        isInvalid={Boolean(errors.repository)}
        error={errors.repository}
        fullWidth
      >
        {renderRepositorySelect()}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderRepositorySelect = () => {
    if (isLoadingRepositories) {
      return (
        <SectionLoading inline={true}>
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.loadingRepositoriesDescription"
            defaultMessage="Loading repositories…"
          />
        </SectionLoading>
      );
    }

    if (errorLoadingRepositories) {
      return (
        <SectionError
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.loadingRepositoriesErrorMessage"
              defaultMessage="Error loading repositories"
            />
          }
          error={{ data: { error: 'test' } } || errorLoadingRepositories}
          actions={
            <EuiButton
              onClick={() => reloadRepositories()}
              color="danger"
              iconType="refresh"
              data-test-subj="reloadRepositoriesButton"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.reloadRepositoriesButtonLabel"
                defaultMessage="Reload repositories"
              />
            </EuiButton>
          }
        />
      );
    }

    if (repositories.length === 0) {
      return (
        <SectionError
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.noRepositoriesErrorTitle"
              defaultMessage="You don't have any repositories"
            />
          }
          error={{
            data: {
              error: i18n.translate('xpack.snapshotRestore.policyForm.noRepositoriesErrorMessage', {
                defaultMessage: 'A repository is required to store snapshots.',
              }),
            },
          }}
          actions={
            <EuiButton
              href={linkToAddRepository(currentUrl)}
              color="danger"
              iconType="plusInCircle"
              data-test-subj="addRepositoryButton"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.addRepositoryButtonLabel"
                defaultMessage="Register a repository"
              />
            </EuiButton>
          }
        />
      );
    }

    return (
      <EuiSelect
        options={repositories.map(({ name }: Repository) => ({
          value: name,
          text: name,
        }))}
        value={policy.repository || repositories[0].name}
        onChange={e => {
          updatePolicy({
            repository: e.target.value,
          });
        }}
        fullWidth
        data-test-subj="repositorySelect"
      />
    );
  };

  const renderSnapshotNameField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.fields.snapshotNameDescriptionTitle"
              defaultMessage="Snapshot name"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.fields.snapshotNameDescription"
          defaultMessage="Name for the automatic snapshots taken by this policy.
            Supports date math expressions to easily identify snapshots."
        />
      }
      idAria="policySnapshotNameDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.fields.policySnapshotNameLabel"
            defaultMessage="Snapshot name"
          />
        }
        describedByIds={['policySnapshotNameDescription']}
        isInvalid={Boolean(errors.snapshotName)}
        error={errors.snapshotName}
        helpText={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.fields.policySnapshotNameHelpText"
            defaultMessage="Supports date math expressions. {docLink}"
            values={{
              docLink: (
                <EuiLink
                  href={documentationLinksService.getDateMathIndexNamesUrl()}
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyForm.fields.policySnapshotNameHelpTextDocLink"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        fullWidth
      >
        <EuiFieldText
          defaultValue={policy.snapshotName}
          fullWidth
          onChange={e => {
            updatePolicy({
              snapshotName: e.target.value,
            });
          }}
          placeholder={i18n.translate(
            'xpack.snapshotRestore.policyForm.fields.policySnapshotNamePlaceholder',
            {
              defaultMessage: '<daily-snap-\\{now/d\\}>',
              description:
                'Example date math snapshot name. Keeping the same syntax is important: <SOME-TRANSLATION-{now/d}>',
            }
          )}
          data-test-subj="snapshotNameInput"
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderScheduleField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.fields.scheduleDescriptionTitle"
              defaultMessage="Schedule"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.fields.scheduleDescription"
          defaultMessage="How often to run this policy."
        />
      }
      idAria="policyScheduleDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.fields.policyScheduleLabel"
            defaultMessage="Schedule"
          />
        }
        describedByIds={['policyScheduleDescription']}
        isInvalid={Boolean(errors.schedule)}
        error={errors.schedule}
        helpText={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.fields.policyScheduleHelpText"
            defaultMessage="Use cron expression. {docLink}"
            values={{
              docLink: (
                <EuiLink href={documentationLinksService.getCronUrl()} target="_blank">
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyForm.fields.policyScheduleHelpTextDocLink"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        fullWidth
      >
        <EuiFieldText
          defaultValue={policy.schedule}
          fullWidth
          onChange={e => {
            updatePolicy({
              schedule: e.target.value,
            });
          }}
          placeholder="0 30 1 * * ?"
          data-test-subj="snapshotNameInput"
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderActions = () => {
    const saveLabel = (
      <FormattedMessage
        id="xpack.snapshotRestore.policyForm.saveButtonLabel"
        defaultMessage="Save"
      />
    );
    const savingLabel = (
      <FormattedMessage
        id="xpack.snapshotRestore.policyForm.savingButtonLabel"
        defaultMessage="Saving…"
      />
    );

    return (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            color={'secondary'}
            iconType="check"
            onClick={() => onSave(policy)}
            fill
            data-test-subj="submitButton"
            isLoading={isSaving}
          >
            {isSaving ? savingLabel : saveLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="primary" onClick={onCancel}>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiForm>
      {renderNameField()}
      {renderSnapshotNameField()}
      {renderRepositoryField()}
      {renderScheduleField()}
      {renderActions()}
    </EuiForm>
  );
};

PolicyForm.defaultProps = {
  isEditing: false,
  isSaving: false,
};
