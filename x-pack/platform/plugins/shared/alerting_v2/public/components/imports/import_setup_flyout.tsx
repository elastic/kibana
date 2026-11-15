/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useForm } from 'react-hook-form';
import type { FieldPath, RegisterOptions } from 'react-hook-form';
import { useCreateImport } from '../../hooks/use_create_import';
import type { ImportSetupStep } from './create_import';
import { ImportCredentials } from './import_credentials';
import {
  DEFAULT_IMPORT_FORM_STATE,
  SEVERITY_OPTIONS,
  validateFingerprintField,
  validateName,
} from './import_form';
import type { ImportFormState } from './import_form';

const optionalLabel = (
  <EuiText size="xs" color="subdued">
    {i18n.translate('xpack.alertingV2.imports.form.optional', { defaultMessage: 'Optional' })}
  </EuiText>
);

const SETUP_STEP_LABELS: Record<ImportSetupStep, string> = {
  create_connector: i18n.translate('xpack.alertingV2.imports.setupStep.createConnector', {
    defaultMessage: 'Creating the webhook connector',
  }),
  create_token: i18n.translate('xpack.alertingV2.imports.setupStep.createToken', {
    defaultMessage: 'Generating the token',
  }),
  create_workflow: i18n.translate('xpack.alertingV2.imports.setupStep.createWorkflow', {
    defaultMessage: 'Creating the workflow',
  }),
};

interface ImportSetupFlyoutProps {
  onClose: () => void;
}

/**
 * Flyout that sets up a custom webhook import: the form, then the webhook URL and token once the
 * connector and workflow exist.
 */
export const ImportSetupFlyout = ({ onClose }: ImportSetupFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'importSetupFlyoutTitle' });
  const {
    mutate: createImport,
    data: created,
    error: createError,
    isLoading,
    reset: resetCreate,
  } = useCreateImport();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm<ImportFormState>({
    mode: 'onChange',
    defaultValues: DEFAULT_IMPORT_FORM_STATE,
  });

  // EUI fields take their ref as `inputRef`.
  const registerField = <TFieldName extends FieldPath<ImportFormState>>(
    fieldName: TFieldName,
    options?: RegisterOptions<ImportFormState, TFieldName>
  ) => {
    const { ref, ...rest } = register(fieldName, options);
    return { ...rest, inputRef: ref };
  };

  const submit = handleSubmit((values) => {
    resetCreate();
    createImport(values);
  });

  // Closing mid-setup would leave the cleanup of a failed step unseen.
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <EuiFlyout
      onClose={handleClose}
      aria-labelledby={titleId}
      size="m"
      ownFocus
      hideCloseButton={isLoading}
      outsideClickCloses={!isLoading}
      data-test-subj="importSetupFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={titleId}>
          <h2>
            <FormattedMessage
              id="xpack.alertingV2.imports.setup.title"
              defaultMessage="Custom webhook"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.alertingV2.imports.setup.subtitle"
              defaultMessage="Send alerts from any system with a webhook."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {created ? (
          <ImportCredentials
            name={getValues('name').trim()}
            created={created}
            fingerprintField={getValues('fingerprintField').trim()}
          />
        ) : (
          <form onSubmit={submit} noValidate data-test-subj="importSetupForm">
            {createError && (
              <>
                <KbnDangerCallout
                  announceOnMount
                  data-test-subj="importSetupError"
                  title={i18n.translate('xpack.alertingV2.imports.setup.errorTitle', {
                    defaultMessage: 'The import could not be set up',
                  })}
                >
                  <p>{createError.message}</p>
                  <p>
                    <FormattedMessage
                      id="xpack.alertingV2.imports.setup.errorStep"
                      defaultMessage="Failed step: {step}. Everything created before it was removed."
                      values={{ step: SETUP_STEP_LABELS[createError.step] }}
                    />
                  </p>
                </KbnDangerCallout>
                <EuiSpacer size="m" />
              </>
            )}
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.alertingV2.imports.form.name.label', {
                defaultMessage: 'Name',
              })}
              isInvalid={errors.name !== undefined}
              error={errors.name?.message}
            >
              <EuiFieldText
                fullWidth
                autoFocus
                isInvalid={errors.name !== undefined}
                data-test-subj="importFormName"
                {...registerField('name', { validate: validateName })}
              />
            </EuiFormRow>

            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.alertingV2.imports.form.description.label', {
                defaultMessage: 'Description',
              })}
              labelAppend={optionalLabel}
            >
              <EuiTextArea
                fullWidth
                rows={2}
                data-test-subj="importFormDescription"
                {...registerField('description')}
              />
            </EuiFormRow>

            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h3>
                <FormattedMessage
                  id="xpack.alertingV2.imports.form.alertsSection"
                  defaultMessage="How alerts are created"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />

            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.alertingV2.imports.form.severity.label', {
                defaultMessage: 'Default severity',
              })}
              helpText={i18n.translate('xpack.alertingV2.imports.form.severity.help', {
                defaultMessage: 'Given to every imported alert.',
              })}
            >
              <EuiSelect
                fullWidth
                options={SEVERITY_OPTIONS}
                data-test-subj="importFormSeverity"
                {...registerField('defaultSeverity')}
              />
            </EuiFormRow>

            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.alertingV2.imports.form.fingerprintField.label', {
                defaultMessage: 'Fingerprint field',
              })}
              labelAppend={optionalLabel}
              helpText={i18n.translate('xpack.alertingV2.imports.form.fingerprintField.help', {
                defaultMessage:
                  'Which field in the payload identifies one alert series. Leave empty to create a new alert for every payload.',
              })}
              isInvalid={errors.fingerprintField !== undefined}
              error={errors.fingerprintField?.message}
            >
              <EuiFieldText
                fullWidth
                placeholder="monitor_id"
                isInvalid={errors.fingerprintField !== undefined}
                data-test-subj="importFormFingerprintField"
                {...registerField('fingerprintField', { validate: validateFingerprintField })}
              />
            </EuiFormRow>
          </form>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        {created ? (
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={onClose} data-test-subj="importSetupDone">
                <FormattedMessage id="xpack.alertingV2.imports.setup.done" defaultMessage="Done" />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={handleClose}
                isDisabled={isLoading}
                data-test-subj="importSetupCancel"
              >
                <FormattedMessage
                  id="xpack.alertingV2.imports.setup.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={() => submit()}
                isLoading={isLoading}
                isDisabled={!isValid}
                data-test-subj="importSetupSubmit"
              >
                <FormattedMessage
                  id="xpack.alertingV2.imports.setup.create"
                  defaultMessage="Create import"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
