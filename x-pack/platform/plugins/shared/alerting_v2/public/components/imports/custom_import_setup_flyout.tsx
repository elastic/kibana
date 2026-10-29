/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnSuccessCallout } from '@kbn/ui-callout';
import { SEVERITY_LEVELS } from '@kbn/alerting-v2-schemas';
import type { CreateImportResponse } from '@kbn/alerting-v2-schemas';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { FieldPath, RegisterOptions } from 'react-hook-form';
import { useCreateImport } from '../../hooks/use_create_import';
import {
  DEFAULT_CUSTOM_IMPORT_FORM_STATE,
  getSetupStepLabel,
  parseImportRequestError,
  toCreateImportData,
  toImportSource,
  validateFingerprintField,
  validateName,
  validateSource,
} from './custom_import_form';
import type { CustomImportFormState } from './custom_import_form';
import { ImportCredentialsPanel } from './import_credentials_panel';
import { SendTestAlert } from './send_test_alert';
import { TagsField } from './tags_field';

const optionalLabel = (
  <EuiText size="xs" color="subdued">
    {i18n.translate('xpack.alertingV2.imports.form.optional', { defaultMessage: 'Optional' })}
  </EuiText>
);

const SEVERITY_LABELS: Record<(typeof SEVERITY_LEVELS)[number], string> = {
  info: i18n.translate('xpack.alertingV2.imports.severity.info', { defaultMessage: 'Info' }),
  low: i18n.translate('xpack.alertingV2.imports.severity.low', { defaultMessage: 'Low' }),
  medium: i18n.translate('xpack.alertingV2.imports.severity.medium', { defaultMessage: 'Medium' }),
  high: i18n.translate('xpack.alertingV2.imports.severity.high', { defaultMessage: 'High' }),
  critical: i18n.translate('xpack.alertingV2.imports.severity.critical', {
    defaultMessage: 'Critical',
  }),
};

export const SEVERITY_OPTIONS = SEVERITY_LEVELS.map((level) => ({
  value: level,
  text: SEVERITY_LABELS[level],
}));

export const getSeverityLabel = (severity: string | undefined): string | undefined =>
  SEVERITY_OPTIONS.find((option) => option.value === severity)?.text ?? severity;

interface CustomImportSetupFlyoutProps {
  onClose: () => void;
  /** Goes back to the source picker. Shown instead of Cancel when the flyout was opened from it. */
  onBack?: () => void;
  /** Called as soon as the import exists, so the list behind the flyout can refetch. */
  onCreated?: () => void;
}

export const CustomImportSetupFlyout = ({
  onClose,
  onBack,
  onCreated,
}: CustomImportSetupFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'importsSetupFlyoutTitle' });
  const userProfile = useService(CoreStart('userProfile'));
  const {
    mutate: createImport,
    isLoading,
    error: createError,
    isError,
    reset: resetCreate,
  } = useCreateImport();
  const [created, setCreated] = useState<CreateImportResponse | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid, dirtyFields },
  } = useForm<CustomImportFormState>({
    mode: 'onChange',
    defaultValues: DEFAULT_CUSTOM_IMPORT_FORM_STATE,
  });

  // EUI fields take their ref as `inputRef`.
  const registerField = <TFieldName extends FieldPath<CustomImportFormState>>(
    fieldName: TFieldName,
    options?: RegisterOptions<CustomImportFormState, TFieldName>
  ) => {
    const { ref, ...rest } = register(fieldName, options);
    return { ...rest, inputRef: ref };
  };

  const name = useWatch({ control, name: 'name' });
  const isSourceEdited = dirtyFields.source === true;
  const isOwnerEdited = dirtyFields.owner === true;

  // The source follows the name until the user edits it.
  useEffect(() => {
    if (!isSourceEdited) {
      setValue('source', toImportSource(name), { shouldValidate: true });
    }
  }, [name, isSourceEdited, setValue]);

  // Owner defaults to the current user, and is only a suggestion.
  useEffect(() => {
    let cancelled = false;
    userProfile
      .getCurrent()
      .then((profile) => {
        const displayName = profile.user.full_name ?? profile.user.username;
        if (!cancelled && !isOwnerEdited && displayName) {
          setValue('owner', displayName);
        }
      })
      .catch(() => {
        // No profile, the owner stays empty.
      });
    return () => {
      cancelled = true;
    };
    // Only on mount: later edits by the user must not be overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = handleSubmit((values) => {
    createImport(toCreateImportData(values), {
      onSuccess: (response) => {
        setCreated(response);
        onCreated?.();
      },
    });
  });

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // The list behind the flyout already refetched when the import was created. Once the user is
  // done, a test alert may have arrived since, so refetch again.
  const handleDone = () => {
    onCreated?.();
    onClose();
  };

  const requestError = isError ? parseImportRequestError(createError) : undefined;

  return (
    <EuiFlyout
      onClose={handleClose}
      aria-labelledby={titleId}
      size="m"
      ownFocus
      outsideClickCloses={isLoading ? false : undefined}
      hideCloseButton={isLoading}
      onKeyDownCapture={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (isLoading && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      data-test-subj="importsSetupFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={titleId}>
          <h2 data-test-subj="importsSetupFlyoutTitle">
            {created ? (
              <FormattedMessage
                id="xpack.alertingV2.imports.setup.connectTitle"
                defaultMessage="Connect your source"
              />
            ) : (
              <FormattedMessage
                id="xpack.alertingV2.imports.setup.title"
                defaultMessage="Custom webhook"
              />
            )}
          </h2>
        </EuiTitle>
        {!created && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.alertingV2.imports.setup.subtitle"
                  defaultMessage="Send alerts from any system with a webhook."
                />
              </p>
            </EuiText>
          </>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {created ? (
          <ConnectYourSource created={created} onTestSent={onCreated} />
        ) : (
          <form onSubmit={onSubmit} noValidate data-test-subj="importsSetupForm">
            {requestError && (
              <>
                <KbnDangerCallout
                  announceOnMount
                  data-test-subj="importsSetupError"
                  title={i18n.translate('xpack.alertingV2.imports.setup.errorTitle', {
                    defaultMessage: 'The import could not be set up',
                  })}
                  text={
                    <>
                      <p>{requestError.message}</p>
                      {requestError.step && (
                        <p data-test-subj="importsSetupErrorStep">
                          <FormattedMessage
                            id="xpack.alertingV2.imports.setup.errorStep"
                            defaultMessage="Failed step: {step}."
                            values={{ step: getSetupStepLabel(requestError.step) }}
                          />{' '}
                          {requestError.rolledBack
                            ? i18n.translate('xpack.alertingV2.imports.setup.rolledBack', {
                                defaultMessage: 'Everything created so far was removed.',
                              })
                            : null}
                        </p>
                      )}
                    </>
                  }
                />
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
                disabled={isLoading}
                data-test-subj="importsFormName"
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
                disabled={isLoading}
                data-test-subj="importsFormDescription"
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
              label={i18n.translate('xpack.alertingV2.imports.form.source.label', {
                defaultMessage: 'Source',
              })}
              helpText={i18n.translate('xpack.alertingV2.imports.form.source.help', {
                defaultMessage: 'The source name shown on imported alerts.',
              })}
              isInvalid={errors.source !== undefined}
              error={errors.source?.message}
            >
              <EuiFieldText
                fullWidth
                isInvalid={errors.source !== undefined}
                disabled={isLoading}
                data-test-subj="importsFormSource"
                {...registerField('source', { validate: validateSource })}
              />
            </EuiFormRow>

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
                disabled={isLoading}
                data-test-subj="importsFormSeverity"
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
                disabled={isLoading}
                data-test-subj="importsFormFingerprintField"
                {...registerField('fingerprintField', { validate: validateFingerprintField })}
              />
            </EuiFormRow>

            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h3>
                <FormattedMessage
                  id="xpack.alertingV2.imports.form.organizeSection"
                  defaultMessage="Organize"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />

            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.alertingV2.imports.form.tags.label', {
                defaultMessage: 'Tags',
              })}
              labelAppend={optionalLabel}
            >
              <Controller
                control={control}
                name="tags"
                render={({ field }) => (
                  <TagsField
                    value={field.value}
                    onChange={field.onChange}
                    aria-label={i18n.translate('xpack.alertingV2.imports.form.tags.ariaLabel', {
                      defaultMessage: 'Tags',
                    })}
                    data-test-subj="importsFormTags"
                  />
                )}
              />
            </EuiFormRow>

            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.alertingV2.imports.form.routingTags.label', {
                defaultMessage: 'Routing tags',
              })}
              labelAppend={optionalLabel}
              helpText={i18n.translate('xpack.alertingV2.imports.form.routingTags.help', {
                defaultMessage: 'Stored now, used by action policies later.',
              })}
            >
              <Controller
                control={control}
                name="routingTags"
                render={({ field }) => (
                  <TagsField
                    value={field.value}
                    onChange={field.onChange}
                    aria-label={i18n.translate(
                      'xpack.alertingV2.imports.form.routingTags.ariaLabel',
                      { defaultMessage: 'Routing tags' }
                    )}
                    data-test-subj="importsFormRoutingTags"
                  />
                )}
              />
            </EuiFormRow>

            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.alertingV2.imports.form.owner.label', {
                defaultMessage: 'Owner',
              })}
              labelAppend={optionalLabel}
            >
              <EuiFieldText
                fullWidth
                disabled={isLoading}
                data-test-subj="importsFormOwner"
                {...registerField('owner')}
              />
            </EuiFormRow>

            <EuiSpacer size="m" />
            <EuiAccordion
              id="importsWhatWillBeCreated"
              buttonContent={i18n.translate('xpack.alertingV2.imports.form.whatWillBeCreated', {
                defaultMessage: 'What will be created',
              })}
              paddingSize="m"
              data-test-subj="importsWhatWillBeCreated"
            >
              <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
                <EuiDescriptionList
                  compressed
                  type="column"
                  listItems={[
                    {
                      title: i18n.translate('xpack.alertingV2.imports.form.created.connector', {
                        defaultMessage: 'Connector',
                      }),
                      description: i18n.translate(
                        'xpack.alertingV2.imports.form.created.connectorDescription',
                        {
                          defaultMessage:
                            'An inbound webhook connector that receives the payloads.',
                        }
                      ),
                    },
                    {
                      title: i18n.translate('xpack.alertingV2.imports.form.created.workflow', {
                        defaultMessage: 'Workflow',
                      }),
                      description: i18n.translate(
                        'xpack.alertingV2.imports.form.created.workflowDescription',
                        {
                          defaultMessage:
                            'A workflow tagged custom-import, named "Import: {name}", that turns each payload into an alert.',
                          values: { name: name.trim() || '...' },
                        }
                      ),
                    },
                  ]}
                />
              </EuiPanel>
            </EuiAccordion>
          </form>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          {created ? (
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={handleDone} data-test-subj="importsSetupDone">
                <FormattedMessage id="xpack.alertingV2.imports.setup.done" defaultMessage="Done" />
              </EuiButton>
            </EuiFlexItem>
          ) : (
            <>
              <EuiFlexItem grow={false}>
                {onBack ? (
                  <EuiButtonEmpty
                    iconType="chevronSingleLeft"
                    onClick={onBack}
                    isDisabled={isLoading}
                    data-test-subj="importsSetupBack"
                  >
                    <FormattedMessage
                      id="xpack.alertingV2.imports.setup.back"
                      defaultMessage="Back"
                    />
                  </EuiButtonEmpty>
                ) : (
                  <EuiButtonEmpty
                    onClick={handleClose}
                    isDisabled={isLoading}
                    data-test-subj="importsSetupCancel"
                  >
                    <FormattedMessage
                      id="xpack.alertingV2.imports.setup.cancel"
                      defaultMessage="Cancel"
                    />
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={() => {
                    resetCreate();
                    onSubmit();
                  }}
                  isLoading={isLoading}
                  isDisabled={!isValid}
                  data-test-subj="importsSetupSubmit"
                >
                  <FormattedMessage
                    id="xpack.alertingV2.imports.setup.create"
                    defaultMessage="Create import"
                  />
                </EuiButton>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const ConnectYourSource = ({
  created,
  onTestSent,
}: {
  created: CreateImportResponse;
  onTestSent?: () => void;
}) => (
  <div data-test-subj="importsSetupConnect">
    <KbnSuccessCallout
      announceOnMount
      size="s"
      data-test-subj="importsSetupSuccess"
      title={i18n.translate('xpack.alertingV2.imports.setup.successTitle', {
        defaultMessage: '{name} is ready to receive alerts',
        values: { name: created.import.name },
      })}
    />
    <EuiSpacer size="m" />
    <ImportCredentialsPanel
      url={created.url}
      token={created.credentials?.token}
      publicBaseUrlConfigured={created.public_base_url_configured}
      fingerprintField={created.import.fingerprint_field}
    />
    <EuiSpacer size="l" />
    <EuiTitle size="xxs">
      <h3>
        <FormattedMessage
          id="xpack.alertingV2.imports.setup.testTitle"
          defaultMessage="Try it out"
        />
      </h3>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiText size="s" color="subdued">
      <p>
        <FormattedMessage
          id="xpack.alertingV2.imports.setup.testBody"
          defaultMessage="Send a sample payload through the workflow to check the setup end to end."
        />
      </p>
    </EuiText>
    <EuiSpacer size="s" />
    <SendTestAlert importId={created.import.id} onSent={onTestSent} />
  </div>
);
