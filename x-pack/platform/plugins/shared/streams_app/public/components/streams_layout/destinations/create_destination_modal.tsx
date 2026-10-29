/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller, FormProvider } from 'react-hook-form';
import {
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
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { DestinationsController } from './destinations_context';
import { DestinationTypeFields } from './destination_type_fields';
import { DESTINATION_TYPE_DEFINITIONS } from './destination_type_registry';
import { useDestinationCreationForm } from './use_destination_creation_form';

const CREATE_DESTINATION_MODAL_WIDTH = 560;
/** Unit schema `description` limit. */
const MAX_DESCRIPTION_LENGTH = 10000;

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
    canSubmit,
  } = useDestinationCreationForm({ unitDefinition });
  // The destination being saved is already in the unit, so its own name would read as taken.
  const formErrors = isCreatingDestination ? {} : validationErrors;
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
          defaultMessage: 'This name is too long for an S3 destination.',
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
      // EuiModal caps height at 75vh, which makes the S3 form scroll on a laptop screen.
      style={{ width: CREATE_DESTINATION_MODAL_WIDTH, maxBlockSize: '90vh' }}
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
                id="xpack.streams.destinations.createDestinationModalDescription"
                defaultMessage="Define where your data will land"
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
              <EuiFormFieldset
                legend={{
                  children: i18n.translate('xpack.streams.destinations.storageKindLabel', {
                    defaultMessage: "Where will this destination's data live?",
                  }),
                }}
              >
                <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
                  {DESTINATION_TYPE_DEFINITIONS.filter((definition) => definition.available).map(
                    (definition) => (
                      <EuiFlexItem key={definition.storageKind} grow={false}>
                        <EuiCheckableCard
                          id={`streamsDestinationStorage-${definition.storageKind}`}
                          name="destinationStorageKind"
                          label={definition.label}
                          checked={storageKind === definition.storageKind}
                          disabled={isCreatingDestination}
                          onChange={() =>
                            methods.setValue('storageKind', definition.storageKind, {
                              shouldDirty: true,
                            })
                          }
                          data-test-subj={definition.testSubject}
                        >
                          {storageKind === definition.storageKind && (
                            <DestinationTypeFields
                              storageKind={storageKind}
                              errors={formErrors}
                              disabled={isCreatingDestination}
                            />
                          )}
                        </EuiCheckableCard>
                      </EuiFlexItem>
                    )
                  )}
                </EuiFlexGroup>
              </EuiFormFieldset>
              <EuiSpacer size="m" />
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.streams.destinations.destinationNameLabel', {
                  defaultMessage: 'Destination name',
                })}
                helpText={i18n.translate(
                  'xpack.streams.destinations.destinationNameHelpDescription',
                  {
                    defaultMessage: "Permanent once created. Destinations can't be renamed.",
                  }
                )}
                isInvalid={Boolean(destinationNameErrorText)}
                error={destinationNameErrorText}
              >
                <Controller
                  control={methods.control}
                  name="destinationName"
                  render={({ field: { value, onChange, onBlur, ref } }) => (
                    <EuiFieldText
                      fullWidth
                      value={value}
                      inputRef={ref}
                      disabled={isCreatingDestination}
                      isInvalid={Boolean(destinationNameErrorText)}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder={i18n.translate(
                        'xpack.streams.destinations.destinationNamePlaceholder',
                        { defaultMessage: 'logs-nginx-default' }
                      )}
                      data-test-subj="streamsCreateDestinationName"
                    />
                  )}
                />
              </EuiFormRow>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.streams.destinations.descriptionLabel', {
                  defaultMessage: 'Description',
                })}
                labelAppend={
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.streams.destinations.descriptionOptionalLabel', {
                      defaultMessage: 'Optional',
                    })}
                  </EuiText>
                }
              >
                <Controller
                  control={methods.control}
                  name="description"
                  render={({ field: { value, onChange, onBlur, ref } }) => (
                    <EuiTextArea
                      fullWidth
                      rows={3}
                      value={value}
                      inputRef={ref}
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      disabled={isCreatingDestination}
                      onChange={onChange}
                      onBlur={onBlur}
                      data-test-subj="streamsCreateDestinationDescription"
                    />
                  )}
                />
              </EuiFormRow>
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
