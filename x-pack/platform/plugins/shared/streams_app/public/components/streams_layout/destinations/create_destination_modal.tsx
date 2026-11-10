/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider, useController } from 'react-hook-form';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormFieldset,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { DestinationsController } from './destinations_context';
import { getDestinationTypeSteps, getStepStatus } from './destination_type_fields';
import {
  DESTINATION_TYPE_DEFINITIONS,
  type DestinationTypeDefinition,
} from './destination_type_registry';
import type { DestinationCreationFormData } from './types';
import { useDestinationCreationForm } from './use_destination_creation_form';

const CREATE_DESTINATION_MODAL_WIDTH = 576;
/** Unit schema `description` limit. */
const MAX_DESCRIPTION_LENGTH = 10000;

const modalStyles = css({
  inlineSize: CREATE_DESTINATION_MODAL_WIDTH,
  // EuiModal caps height at 75vh, which makes the S3 form scroll on a laptop screen.
  maxBlockSize: '90vh',
});

/** Props `EuiFormRow` clones onto its child, so the label and help text reach the input. */
interface FormRowChildProps {
  id?: string;
  'aria-describedby'?: string;
}

const DestinationNameInput = ({
  isInvalid,
  disabled,
  ...rowProps
}: FormRowChildProps & { isInvalid: boolean; disabled: boolean }) => {
  const {
    field: { value, onChange, onBlur, ref },
  } = useController<DestinationCreationFormData, 'destinationName'>({ name: 'destinationName' });
  return (
    <EuiFieldText
      {...rowProps}
      fullWidth
      value={value}
      inputRef={ref}
      disabled={disabled}
      isInvalid={isInvalid}
      onChange={onChange}
      onBlur={onBlur}
      data-test-subj="streamsCreateDestinationName"
    />
  );
};

const DescriptionInput = ({ disabled, ...rowProps }: FormRowChildProps & { disabled: boolean }) => {
  const {
    field: { value, onChange, onBlur, ref },
  } = useController<DestinationCreationFormData, 'description'>({ name: 'description' });
  return (
    <EuiTextArea
      {...rowProps}
      fullWidth
      rows={3}
      value={value}
      inputRef={ref}
      maxLength={MAX_DESCRIPTION_LENGTH}
      disabled={disabled}
      onChange={onChange}
      onBlur={onBlur}
      data-test-subj="streamsCreateDestinationDescription"
    />
  );
};

const STORAGE_KIND_LABEL = i18n.translate('xpack.streams.destinations.storageKindLabel', {
  defaultMessage: "Where will this destination's data live?",
});

// The label names the radio, so the description stays out of it.
const StorageCardLabel = ({ label, badge }: DestinationTypeDefinition) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem>
      <EuiText size="s">
        <strong>{label}</strong>
      </EuiText>
    </EuiFlexItem>
    {badge && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{badge}</EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

interface CreateDestinationModalProps {
  destinations: Pick<
    DestinationsController,
    | 'createDestination'
    | 'unitDefinition'
    | 'isUnitSaving'
    | 'apiKeyError'
    | 'persistenceError'
    | 'isCreatingDestination'
    | 'isCreateFailed'
  >;
  onClose: () => void;
}

export const CreateDestinationModal = ({ destinations, onClose }: CreateDestinationModalProps) => {
  const {
    createDestination,
    unitDefinition,
    isUnitSaving,
    persistenceError,
    apiKeyError,
    isCreatingDestination,
    isCreateFailed,
  } = destinations;
  const modalTitleId = useGeneratedHtmlId({ prefix: 'streamsCreateDestinationModalTitle' });
  const formId = useGeneratedHtmlId({ prefix: 'streamsCreateDestinationForm' });
  const {
    methods,
    formData: { storageKind },
    formErrors: validationErrors,
    stepErrors: currentErrors,
    canSubmit,
  } = useDestinationCreationForm({ unitDefinition });
  // The destination being saved is already in the unit, so its own name would read as taken.
  const formErrors = isCreatingDestination ? {} : validationErrors;
  const stepErrors = isCreatingDestination ? {} : currentErrors;
  const { destinationName: destinationNameError } = formErrors;
  const destinationNameErrorText =
    destinationNameError === 'required'
      ? i18n.translate('xpack.streams.destinations.destinationNameRequiredErrorMessage', {
          defaultMessage: 'Enter a destination name.',
        })
      : destinationNameError === 'duplicate'
      ? i18n.translate('xpack.streams.destinations.destinationNameDuplicateErrorMessage', {
          defaultMessage: 'A destination with this name already exists.',
        })
      : destinationNameError === 'tooLong'
      ? i18n.translate('xpack.streams.destinations.destinationNameTooLongErrorMessage', {
          defaultMessage: 'This name is too long for this destination type.',
        })
      : destinationNameError === 'credentialConflict'
      ? i18n.translate('xpack.streams.destinations.destinationNameCredentialConflictErrorMessage', {
          defaultMessage: 'This name conflicts with an existing credential.',
        })
      : undefined;

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={isCreatingDestination ? () => undefined : onClose}
      maxWidth={CREATE_DESTINATION_MODAL_WIDTH}
      css={modalStyles}
      data-test-subj="streamsCreateDestinationModal"
    >
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle id={modalTitleId}>
              <FormattedMessage
                id="xpack.streams.destinations.createDestinationModalTitle"
                defaultMessage="Create destination"
              />
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.streams.destinations.createDestinationModalSubtitle"
                defaultMessage="Choose where your data lives and how it's organized."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        {(apiKeyError || persistenceError) && (
          <>
            <KbnDangerCallout
              announceOnMount
              title={
                apiKeyError
                  ? i18n.translate(
                      'xpack.streams.destinations.createDestinationApiKeyFailedTitle',
                      {
                        defaultMessage: 'Could not create an API key for this destination',
                      }
                    )
                  : i18n.translate('xpack.streams.destinations.createDestinationFailedTitle', {
                      defaultMessage: 'Could not create the destination',
                    })
              }
              text={apiKeyError ?? persistenceError}
            />
            <EuiSpacer size="s" />
          </>
        )}
        {isCreateFailed ? (
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.streams.destinations.destinationNotSavedDescription"
              defaultMessage="The destination was not saved. Close this dialog and try again."
            />
          </EuiText>
        ) : (
          <FormProvider {...methods}>
            <EuiForm
              id={formId}
              component="form"
              noValidate
              onSubmit={methods.handleSubmit(createDestination)}
            >
              <EuiSteps
                titleSize="xxs"
                headingElement="h3"
                data-test-subj="streamsCreateDestinationSteps"
                steps={[
                  {
                    title: STORAGE_KIND_LABEL,
                    children: (
                      <EuiFormFieldset legend={{ children: STORAGE_KIND_LABEL, display: 'hidden' }}>
                        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
                          {DESTINATION_TYPE_DEFINITIONS.filter(
                            (definition) => definition.available
                          ).map((definition) => (
                            <EuiFlexItem key={definition.storageKind} grow={false}>
                              <EuiCheckableCard
                                id={`streamsDestinationStorage-${definition.storageKind}`}
                                name="destinationStorageKind"
                                label={<StorageCardLabel {...definition} />}
                                checked={storageKind === definition.storageKind}
                                disabled={isCreatingDestination}
                                onChange={() =>
                                  methods.setValue('storageKind', definition.storageKind, {
                                    shouldDirty: true,
                                  })
                                }
                                data-test-subj={definition.testSubject}
                              >
                                <EuiText size="xs" color="subdued">
                                  {definition.description}
                                </EuiText>
                              </EuiCheckableCard>
                            </EuiFlexItem>
                          ))}
                        </EuiFlexGroup>
                      </EuiFormFieldset>
                    ),
                  },
                  ...getDestinationTypeSteps({
                    storageKind,
                    errors: formErrors,
                    stepErrors,
                    disabled: isCreatingDestination,
                  }),
                  {
                    title: i18n.translate(
                      'xpack.streams.destinations.destinationDetailsStepTitle',
                      { defaultMessage: 'Destination details' }
                    ),
                    status: getStepStatus(stepErrors, ['destinationName']),
                    children: (
                      <>
                        <EuiFormRow
                          fullWidth
                          label={i18n.translate(
                            'xpack.streams.destinations.destinationNameFieldLabel',
                            { defaultMessage: 'Name' }
                          )}
                          helpText={i18n.translate(
                            'xpack.streams.destinations.destinationNameHelpDescription',
                            {
                              defaultMessage:
                                "Permanent once created. Destinations can't be renamed.",
                            }
                          )}
                          isInvalid={Boolean(destinationNameErrorText)}
                          error={destinationNameErrorText}
                          id="streamsCreateDestinationNameRow"
                        >
                          <DestinationNameInput
                            isInvalid={Boolean(destinationNameErrorText)}
                            disabled={isCreatingDestination}
                          />
                        </EuiFormRow>
                        <EuiFormRow
                          fullWidth
                          label={i18n.translate('xpack.streams.destinations.descriptionLabel', {
                            defaultMessage: 'Description',
                          })}
                          labelAppend={
                            <EuiText size="xs" color="subdued">
                              {i18n.translate(
                                'xpack.streams.destinations.descriptionOptionalLabel',
                                { defaultMessage: 'Optional' }
                              )}
                            </EuiText>
                          }
                          id="streamsCreateDestinationDescriptionRow"
                        >
                          <DescriptionInput disabled={isCreatingDestination} />
                        </EuiFormRow>
                      </>
                    ),
                  },
                ]}
              />
            </EuiForm>
          </FormProvider>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          isDisabled={isCreatingDestination}
          data-test-subj="streamsCreateDestinationCancel"
        >
          <FormattedMessage
            id="xpack.streams.destinations.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        {!isCreateFailed && (
          <EuiButton
            fill
            type="submit"
            form={formId}
            isLoading={isCreatingDestination}
            isDisabled={!canSubmit || isUnitSaving || isCreatingDestination}
            data-test-subj="streamsCreateDestinationSubmit"
          >
            <FormattedMessage
              id="xpack.streams.destinations.createDestinationButtonLabel"
              defaultMessage="Create destination"
            />
          </EuiButton>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
};
