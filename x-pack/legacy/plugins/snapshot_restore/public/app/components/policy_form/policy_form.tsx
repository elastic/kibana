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
} from '@elastic/eui';
import { SlmPolicyPayload, Repository } from '../../../../common/types';
import { useLoadRepositories } from '../../services/http';
import { linkToAddRepository } from '../../services/navigation';
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
      idAria="policyRepositoryDescription"
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
      {renderRepositoryField()}
      {renderActions()}
    </EuiForm>
  );
};

PolicyForm.defaultProps = {
  isEditing: false,
  isSaving: false,
};
