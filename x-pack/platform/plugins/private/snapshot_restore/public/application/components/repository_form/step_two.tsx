/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

import type { Repository } from '../../../../common/types';
import { REPOSITORY_TYPES } from '../../../../common/constants';
import { isRepositoryReadOnly } from '../../../../common/lib';
import type { RepositoryValidation } from '../../services/validation';
import { TypeSettings } from './type_settings';
import { textService } from '../../services/text';
import { useCore } from '../../app_context';
import { getRepositoryTypeDocUrl } from '../../lib/type_to_doc_url';

interface Props {
  repository: Repository;
  isManagedRepository?: boolean;
  isEditing?: boolean;
  isSaving: boolean;
  onSave: () => void;
  updateRepository: (updatedFields: any) => void;
  validation: RepositoryValidation;
  saveError?: React.ReactNode;
  onBack: () => void;
  onCancel?: () => void;
  isDefaultRepository?: boolean;
  isAlreadyDefaultRepository?: boolean;
  isFirstRepository?: boolean;
  isDefaultRepositoryFeatureAvailable?: boolean;
  onToggleDefault?: (value: boolean) => void;
}

export const RepositoryFormStepTwo: React.FunctionComponent<Props> = ({
  repository,
  isManagedRepository,
  isEditing,
  isSaving,
  onSave,
  updateRepository,
  validation,
  saveError,
  onBack,
  onCancel,
  isDefaultRepository,
  isAlreadyDefaultRepository,
  isDefaultRepositoryFeatureAvailable = true,
  onToggleDefault,
}) => {
  const { docLinks } = useCore();
  const hasValidationErrors: boolean = !validation.isValid;
  const isReadOnly = isRepositoryReadOnly(repository);
  const isDefaultRepositorySelected = Boolean(isAlreadyDefaultRepository || isDefaultRepository);
  const {
    name,
    type,
    settings: { delegateType },
  } = repository;
  const typeForDocs = type === REPOSITORY_TYPES.source ? delegateType : type;
  const isUrlRepository = type === REPOSITORY_TYPES.url;

  const renderSettings = () => (
    <Fragment>
      {/* Repository settings title */}
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2 data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.fields.settingsTitle"
                defaultMessage="{repositoryName} settings"
                values={{
                  repositoryName: `'${name}'`,
                }}
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={getRepositoryTypeDocUrl(docLinks, typeForDocs)}
            target="_blank"
            iconType="question"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.repositoryTypeDocLink"
              defaultMessage="{repositoryType} repository docs"
              values={{
                repositoryType: textService.getRepositoryTypeName(typeForDocs),
              }}
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      {/* Repository settings fields */}
      <TypeSettings
        repository={repository}
        isManagedRepository={isManagedRepository}
        updateRepository={updateRepository}
        settingErrors={
          hasValidationErrors && validation.errors.settings ? validation.errors.settings : {}
        }
        isReadOnlyToggleDisabled={isDefaultRepositorySelected}
        readOnlyToggleDisabledTooltipContent={
          isDefaultRepositorySelected ? (
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.readonlyDisabledForDefaultTooltip"
              defaultMessage="The default repository cannot be read-only."
            />
          ) : undefined
        }
      />
    </Fragment>
  );

  const renderDefaultSetting = () => {
    if (!onToggleDefault || isUrlRepository) {
      return null;
    }

    const isDisabled = Boolean(
      isAlreadyDefaultRepository || isReadOnly || !isDefaultRepositoryFeatureAvailable
    );

    const tooltipContent = !isDefaultRepositoryFeatureAvailable ? (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.fields.defaultRepositoryUnavailableTooltip"
        defaultMessage="The default repository feature is currently unavailable."
      />
    ) : isAlreadyDefaultRepository ? (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.fields.defaultRepositoryDisabledTooltip"
        defaultMessage="This is currently the default repository. To unassign it, you must set another repository as the default."
      />
    ) : isReadOnly ? (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.fields.defaultRepositoryReadOnlyDisabledTooltip"
        defaultMessage="Read-only repositories cannot be set as the default."
      />
    ) : undefined;

    const switchControl = (
      <EuiSwitch
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.fields.defaultRepositorySwitchLabel"
            defaultMessage="Set as default repository"
          />
        }
        checked={Boolean(isDefaultRepository)}
        onChange={(e) => onToggleDefault(e.target.checked)}
        disabled={isDisabled}
        data-test-subj="defaultRepositorySwitch"
      />
    );

    return (
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.fields.defaultRepositoryLabel"
                defaultMessage="Default repository"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.fields.defaultRepositoryHelpText"
            defaultMessage="The default repository stores all snapshots generated by data stream lifecycle management."
          />
        }
        fullWidth
      >
        <EuiFormRow fullWidth>
          {tooltipContent ? (
            <EuiToolTip content={tooltipContent}>{switchControl}</EuiToolTip>
          ) : (
            switchControl
          )}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  const renderActions = () => {
    const saveLabel = isEditing ? (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.saveButtonLabel"
        defaultMessage="Save"
      />
    ) : (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.registerButtonLabel"
        defaultMessage="Register"
      />
    );
    const savingLabel = (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.savingButtonLabel"
        defaultMessage="Saving…"
      />
    );

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          {isEditing ? (
            <EuiButtonEmpty flush="left" onClick={() => onCancel?.()} data-test-subj="cancelButton">
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty
              flush="left"
              iconType="chevronSingleLeft"
              onClick={onBack}
              data-test-subj="backButton"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.backButtonLabel"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color={isManagedRepository ? 'warning' : 'primary'}
            onClick={onSave}
            fill={!isManagedRepository}
            data-test-subj="submitButton"
            isLoading={isSaving}
          >
            {isSaving ? savingLabel : saveLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const renderFormValidationError = () => {
    if (!hasValidationErrors) {
      return null;
    }
    return (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.validationErrorTitle"
              defaultMessage="Fix errors before continuing."
            />
          }
          role="alert"
          color="danger"
          iconType="cross"
          data-test-subj="repositoryFormError"
        />
        <EuiSpacer size="m" />
      </Fragment>
    );
  };

  const renderSaveError = () => {
    if (!saveError) {
      return null;
    }
    return (
      <Fragment>
        {saveError}
        <EuiSpacer size="m" />
      </Fragment>
    );
  };

  return (
    <div data-test-subj="stepTwo">
      {renderSettings()}
      {renderDefaultSetting()}
      {renderFormValidationError()}
      {renderSaveError()}
      {renderActions()}
    </div>
  );
};
