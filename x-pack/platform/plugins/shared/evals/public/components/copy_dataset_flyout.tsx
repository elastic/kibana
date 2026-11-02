/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_DATASET_DESCRIPTION_LENGTH, MAX_DATASET_NAME_LENGTH } from '@kbn/evals-common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useCopyDataset } from '../hooks/use_evals_api';
import { getErrorMessage } from '../utils/get_error_message';

export interface CopyDatasetFlyoutProps {
  datasetId: string;
  datasetName: string;
  datasetDescription?: string;
  onClose: () => void;
  onCopied: (datasetId: string) => void;
}

const TITLE = i18n.translate('xpack.evals.copyDatasetFlyout.copyDatasetTitle', {
  defaultMessage: 'Copy dataset',
});

const NAME_LABEL = i18n.translate('xpack.evals.copyDatasetFlyout.nameLabel', {
  defaultMessage: 'Name',
});

const DESCRIPTION_LABEL = i18n.translate('xpack.evals.copyDatasetFlyout.descriptionLabel', {
  defaultMessage: 'Description (optional)',
});

const CANCEL = i18n.translate('xpack.evals.copyDatasetFlyout.cancelButtonLabel', {
  defaultMessage: 'Cancel',
});

const CONFIRM = i18n.translate('xpack.evals.copyDatasetFlyout.copyButtonLabel', {
  defaultMessage: 'Copy dataset',
});

const ERROR_TITLE = i18n.translate('xpack.evals.copyDatasetFlyout.copyErrorTitle', {
  defaultMessage: 'Unable to copy dataset',
});

const NAME_REQUIRED_ERROR = i18n.translate(
  'xpack.evals.copyDatasetFlyout.nameRequiredErrorMessage',
  {
    defaultMessage: 'Name is required.',
  }
);

const getDefaultCopiedName = (name: string) =>
  i18n.translate('xpack.evals.copyDatasetFlyout.defaultCopiedNameLabel', {
    defaultMessage: '{name} (copy)',
    values: { name },
  });

export const CopyDatasetFlyout: React.FC<CopyDatasetFlyoutProps> = ({
  datasetId,
  datasetName,
  datasetDescription = '',
  onClose,
  onCopied,
}) => {
  const [name, setName] = useState(getDefaultCopiedName(datasetName));
  const [description, setDescription] = useState(datasetDescription);
  const [error, setError] = useState<string | null>(null);
  const copyDataset = useCopyDataset();
  const nameIsEmpty = name.trim().length === 0;

  const clearError = () => {
    if (error) {
      setError(null);
    }
  };

  const onConfirm = async () => {
    try {
      setError(null);
      const copiedDataset = await copyDataset.mutateAsync({
        datasetId,
        body: { name: name.trim(), description },
      });
      onClose();
      onCopied(copiedDataset.dataset_id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <EuiFlyout
      ownFocus
      size="s"
      onClose={onClose}
      aria-labelledby="copyDatasetFlyoutTitle"
      data-test-subj="copyDatasetFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="copyDatasetFlyoutTitle">{TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error ? (
          <>
            <KbnWarningCallout title={ERROR_TITLE} text={error} />
            <EuiSpacer size="m" />
          </>
        ) : null}

        <EuiForm component="form">
          <EuiFormRow
            label={NAME_LABEL}
            fullWidth
            isInvalid={nameIsEmpty}
            error={nameIsEmpty ? NAME_REQUIRED_ERROR : undefined}
          >
            <EuiFieldText
              autoFocus
              required
              value={name}
              maxLength={MAX_DATASET_NAME_LENGTH}
              isInvalid={nameIsEmpty}
              onChange={(event) => {
                setName(event.target.value);
                clearError();
              }}
              data-test-subj="copyDatasetNameInput"
              fullWidth
            />
          </EuiFormRow>

          <EuiFormRow label={DESCRIPTION_LABEL} fullWidth>
            <EuiTextArea
              value={description}
              rows={3}
              maxLength={MAX_DATASET_DESCRIPTION_LENGTH}
              onChange={(event) => {
                setDescription(event.target.value);
                clearError();
              }}
              data-test-subj="copyDatasetDescriptionInput"
              fullWidth
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>{CANCEL}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onConfirm}
              disabled={nameIsEmpty || copyDataset.isLoading}
              isLoading={copyDataset.isLoading}
            >
              {CONFIRM}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
