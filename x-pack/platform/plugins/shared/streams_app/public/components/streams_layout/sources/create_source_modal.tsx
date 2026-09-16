/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { SourceType } from './types';
import type { SourcesController } from './sources_context';
import { SOURCE_TYPE_CONFIGS, SOURCE_TYPE_CONFIG_BY_TYPE } from './source_type_config';
import { SourceSetupInstructions } from './source_setup_instructions';
import { RevealedApiKeyCallout } from './revealed_api_key_callout';

interface CreateSourceModalProps {
  sources: Pick<
    SourcesController,
    | 'createSource'
    | 'sourceType'
    | 'availableSourceTypes'
    | 'sourceName'
    | 'sourceNameError'
    | 'canCreateSource'
    | 'createdSource'
    | 'revealedApiKey'
    | 'apiKeyError'
    | 'isGeneratingApiKey'
    | 'isCreatingSource'
    | 'isSavingSource'
    | 'isCreateFailed'
    | 'setCreateSourceType'
    | 'setCreateSourceName'
    | 'validateCreateSourceName'
  >;
  onClose: () => void;
}

export const CreateSourceModal = ({ sources, onClose }: CreateSourceModalProps) => {
  const {
    createSource,
    sourceType,
    availableSourceTypes,
    sourceName,
    sourceNameError,
    canCreateSource,
    createdSource,
    revealedApiKey,
    apiKeyError,
    isGeneratingApiKey,
    isCreatingSource,
    isSavingSource,
    isCreateFailed,
    setCreateSourceType,
    setCreateSourceName,
    validateCreateSourceName,
  } = sources;

  const sourceTypeOptions = useMemo(
    () =>
      SOURCE_TYPE_CONFIGS.filter((config) => availableSourceTypes.includes(config.type)).map(
        (config) => ({
          value: config.type,
          text: config.label,
        })
      ),
    [availableSourceTypes]
  );

  const sourceNameErrorText =
    sourceNameError === 'required'
      ? i18n.translate('xpack.streams.sources.sourceNameRequiredError', {
          defaultMessage: 'Enter a source name.',
        })
      : sourceNameError === 'duplicate'
      ? i18n.translate('xpack.streams.sources.sourceNameDuplicateError', {
          defaultMessage: 'A source with this name already exists.',
        })
      : undefined;
  const isSetup = Boolean(createdSource && !isCreatingSource && !isCreateFailed);
  const modalTitle = i18n.translate('xpack.streams.sources.createSourceModalTitle', {
    defaultMessage: 'Create source',
  });
  const modalTitleId = useGeneratedHtmlId({ prefix: 'streamsCreateSourceModalTitle' });

  const continueToSetup = useCallback(() => {
    createSource();
  }, [createSource]);

  const done = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={isCreatingSource ? () => {} : onClose}
      maxWidth={isSetup ? 620 : 480}
    >
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle id={modalTitleId}>{modalTitle}</EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.sources.createSourceModalDescription', {
                defaultMessage: 'Choose how data will enter this stream',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        {apiKeyError && (
          <>
            <KbnDangerCallout
              announceOnMount
              title={i18n.translate('xpack.streams.sources.createSourceFailedTitle', {
                defaultMessage: 'Could not finish creating the source',
              })}
              text={apiKeyError}
            />
            <EuiSpacer size="s" />
          </>
        )}
        {isCreatingSource ? (
          <EuiText textAlign="center">
            <EuiLoadingSpinner size="m" />{' '}
            {isSavingSource
              ? i18n.translate('xpack.streams.sources.savingSourceLabel', {
                  defaultMessage: 'Validating and saving source',
                })
              : i18n.translate('xpack.streams.sources.generatingSourceApiKeyLabel', {
                  defaultMessage: 'Generating API key',
                })}
          </EuiText>
        ) : isCreateFailed ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.sources.sourceNotSavedDescription', {
              defaultMessage: 'The source was not saved. Close this dialog and try again.',
            })}
          </EuiText>
        ) : createdSource ? (
          <>
            <CreatedSourceSummary
              typeLabel={SOURCE_TYPE_CONFIG_BY_TYPE[createdSource.type].label}
              name={createdSource.name ?? createdSource.id}
            />
            <EuiSpacer size="m" />
            <SourceSetupInstructions source={createdSource} apiKey={revealedApiKey?.encoded} />
            {revealedApiKey && (
              <>
                <EuiSpacer size="m" />
                <RevealedApiKeyCallout apiKey={revealedApiKey.encoded} />
              </>
            )}
          </>
        ) : (
          <EuiForm
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              createSource();
            }}
          >
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.streams.sources.sourceTypeLabel', {
                defaultMessage: 'Source type',
              })}
            >
              <EuiSelect
                fullWidth
                value={sourceType}
                disabled={isCreatingSource}
                options={sourceTypeOptions}
                onChange={(event) => setCreateSourceType(event.target.value as SourceType)}
                data-test-subj="streamsSourceTypeSelect"
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              isInvalid={Boolean(sourceNameErrorText)}
              error={sourceNameErrorText}
              label={i18n.translate('xpack.streams.sources.sourceNameLabel', {
                defaultMessage: 'Source name',
              })}
            >
              <EuiFieldText
                fullWidth
                value={sourceName}
                disabled={isCreatingSource}
                onChange={(event) => setCreateSourceName(event.target.value)}
                onBlur={validateCreateSourceName}
                isInvalid={Boolean(sourceNameErrorText)}
                data-test-subj="streamsSourceNameInput"
              />
            </EuiFormRow>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.sources.immutableSourceFieldsDescription', {
                defaultMessage: 'Source type and name cannot be changed later',
              })}
            </EuiText>
          </EuiForm>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        {isCreateFailed ? (
          <EuiButton fill onClick={onClose} data-test-subj="streamsCreateSourceErrorCloseButton">
            {i18n.translate('xpack.streams.sources.closeButtonLabel', {
              defaultMessage: 'Close',
            })}
          </EuiButton>
        ) : isSetup ? (
          <EuiButton fill onClick={done} data-test-subj="streamsCreateSourceDoneButton">
            {i18n.translate('xpack.streams.sources.doneButtonLabel', {
              defaultMessage: 'Done',
            })}
          </EuiButton>
        ) : (
          <>
            <EuiButtonEmpty onClick={onClose} isDisabled={isCreatingSource}>
              {i18n.translate('xpack.streams.sources.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              fill
              onClick={continueToSetup}
              isDisabled={!canCreateSource || isCreatingSource}
              isLoading={isCreatingSource || isGeneratingApiKey}
              data-test-subj="streamsCreateSourceContinueButton"
            >
              {i18n.translate('xpack.streams.sources.continueButtonLabel', {
                defaultMessage: 'Continue',
              })}
            </EuiButton>
          </>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
};

const CreatedSourceSummary = ({ typeLabel, name }: { typeLabel: string; name: string }) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="s"
    responsive={false}
    data-test-subj="streamsCreatedSourceSummary"
  >
    <CreatedSourceSummaryItem>
      <FormattedMessage
        id="xpack.streams.sources.createdSourceTypeSummaryDescription"
        defaultMessage="Type: {type}"
        values={{ type: typeLabel }}
      />
    </CreatedSourceSummaryItem>
    <CreatedSourceSummaryItem>
      <FormattedMessage
        id="xpack.streams.sources.createdSourceNameSummaryDescription"
        defaultMessage="Name: {name}"
        values={{ name }}
      />
    </CreatedSourceSummaryItem>
  </EuiFlexGroup>
);

const CreatedSourceSummaryItem = ({ children }: { children: React.ReactNode }) => (
  <EuiFlexItem grow={false}>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="check" color="success" size="s" aria-hidden />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <p>{children}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);
