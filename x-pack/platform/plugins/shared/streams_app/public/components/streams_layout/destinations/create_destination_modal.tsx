/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { DestinationsController } from './destinations_context';
import { DestinationTypeFields } from './destination_type_fields';
import { DESTINATION_TYPE_DEFINITIONS } from './destination_type_registry';
import type { DestinationStorageKind } from './types';

interface CreateDestinationModalProps {
  destinations: Pick<
    DestinationsController,
    | 'createDestination'
    | 'storageKind'
    | 'destinationName'
    | 'destinationNameError'
    | 'elasticsearchIndex'
    | 'elasticsearchIndexPatterns'
    | 'indexError'
    | 'indexPatternsError'
    | 'canCreateDestination'
    | 'persistenceError'
    | 'isCreatingDestination'
    | 'isCreateFailed'
    | 'setStorageKind'
    | 'setCreateDestinationName'
    | 'setElasticsearchIndex'
    | 'setElasticsearchIndexPatterns'
    | 'validateCreationForm'
  >;
  onClose: () => void;
}

export const CreateDestinationModal = ({ destinations, onClose }: CreateDestinationModalProps) => {
  const {
    createDestination,
    storageKind,
    destinationName,
    destinationNameError,
    elasticsearchIndex,
    elasticsearchIndexPatterns,
    indexError,
    indexPatternsError,
    canCreateDestination,
    persistenceError,
    isCreatingDestination,
    isCreateFailed,
    setStorageKind,
    setCreateDestinationName,
    setElasticsearchIndex,
    setElasticsearchIndexPatterns,
    validateCreationForm,
  } = destinations;
  const modalTitleId = useGeneratedHtmlId({ prefix: 'streamsCreateDestinationModalTitle' });
  const destinationNameErrorText =
    destinationNameError === 'required'
      ? i18n.translate('xpack.streams.destinations.destinationNameRequiredErrorMessage', {
          defaultMessage: 'Enter a destination name.',
        })
      : destinationNameError === 'duplicate'
      ? i18n.translate('xpack.streams.destinations.destinationNameDuplicateErrorMessage', {
          defaultMessage: 'A destination with this name already exists.',
        })
      : undefined;

  const selectStorageKind = useCallback(
    (nextStorageKind: DestinationStorageKind) => () => setStorageKind(nextStorageKind),
    [setStorageKind]
  );

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={isCreatingDestination ? () => undefined : onClose}
      maxWidth={480}
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
        {persistenceError && (
          <>
            <KbnDangerCallout
              announceOnMount
              title={i18n.translate('xpack.streams.destinations.createDestinationFailedTitle', {
                defaultMessage: 'Could not create the destination',
              })}
              text={persistenceError}
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
          <EuiForm
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              createDestination();
            }}
          >
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.streams.destinations.destinationNameLabel', {
                defaultMessage: 'Name',
              })}
              helpText={i18n.translate(
                'xpack.streams.destinations.destinationNameHelpDescription',
                {
                  defaultMessage: "Destinations can't be renamed.",
                }
              )}
              isInvalid={Boolean(destinationNameErrorText)}
              error={destinationNameErrorText}
            >
              <EuiFieldText
                fullWidth
                value={destinationName}
                disabled={isCreatingDestination}
                isInvalid={Boolean(destinationNameErrorText)}
                onChange={(event) => setCreateDestinationName(event.target.value)}
                onBlur={validateCreationForm}
                data-test-subj="streamsCreateDestinationName"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              {DESTINATION_TYPE_DEFINITIONS.map((definition) => (
                <EuiFlexItem key={definition.storageKind} grow={false}>
                  <EuiCheckableCard
                    id={`streamsDestinationStorage-${definition.storageKind}`}
                    name="destinationStorageKind"
                    label={definition.label}
                    checked={storageKind === definition.storageKind}
                    disabled={isCreatingDestination}
                    onChange={selectStorageKind(definition.storageKind)}
                    data-test-subj={definition.testSubject}
                  >
                    {storageKind === definition.storageKind && (
                      <DestinationTypeFields
                        storageKind={storageKind}
                        index={elasticsearchIndex}
                        indexPatterns={elasticsearchIndexPatterns}
                        indexError={indexError}
                        indexPatternsError={indexPatternsError}
                        disabled={isCreatingDestination}
                        onIndexChange={setElasticsearchIndex}
                        onIndexPatternsChange={setElasticsearchIndexPatterns}
                        onBlur={validateCreationForm}
                      />
                    )}
                  </EuiCheckableCard>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiForm>
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
            onClick={createDestination}
            isLoading={isCreatingDestination}
            isDisabled={!canCreateDestination || isCreatingDestination}
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
