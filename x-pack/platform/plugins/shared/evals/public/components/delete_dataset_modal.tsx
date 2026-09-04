/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiConfirmModal,
  EuiFieldText,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { DeleteEvaluationDatasetRequestQuery } from '@kbn/evals-common';
import { useDeleteDataset, useEvaluationExperiments } from '../hooks/use_evals_api';
import { getErrorMessage } from '../utils/get_error_message';
import { useDatasetSharing } from './dataset_spaces';

/** Which delete the dialog is describing, and asks the server to hold it to. */
type DatasetDeleteIntent = NonNullable<DeleteEvaluationDatasetRequestQuery['intent']>;

export interface DeleteDatasetModalProps {
  datasetId: string;
  datasetName: string;
  examplesCount: number;
  /** The space assignment, so leaving one space isn't mistaken for a delete. */
  spaceIds?: string[];
  onClose: () => void;
  onDeleted?: () => void;
}

const getTitle = (datasetName: string) =>
  i18n.translate('xpack.evals.deleteDatasetModal.title', {
    defaultMessage: 'Delete dataset "{datasetName}"?',
    values: { datasetName },
  });

const getRemoveTitle = (datasetName: string) =>
  i18n.translate('xpack.evals.deleteDatasetModal.removeTitle', {
    defaultMessage: 'Remove "{datasetName}" from this space?',
    values: { datasetName },
  });

const CALLOUT_TITLE = i18n.translate('xpack.evals.deleteDatasetModal.calloutTitle', {
  defaultMessage: 'This action cannot be undone',
});

const REMOVE_CALLOUT_TITLE = i18n.translate('xpack.evals.deleteDatasetModal.removeCalloutTitle', {
  defaultMessage: 'The dataset stays in its other spaces',
});

const NOW_LAST_SPACE = i18n.translate('xpack.evals.deleteDatasetModal.nowLastSpace', {
  defaultMessage:
    'The other spaces have since let go of this dataset, so this is the only one holding it and removing it would delete it. Nothing has been deleted; confirm below to go ahead.',
});

const NOW_SHARED = i18n.translate('xpack.evals.deleteDatasetModal.nowShared', {
  defaultMessage:
    'This dataset has since been shared with another space, so deleting it here would only remove it from this one. Nothing has been deleted; confirm below to go ahead.',
});

const CANCEL = i18n.translate('xpack.evals.deleteDatasetModal.cancelButton', {
  defaultMessage: 'Cancel',
});

const CONFIRM = i18n.translate('xpack.evals.deleteDatasetModal.confirmButton', {
  defaultMessage: 'Delete dataset',
});

const CONFIRM_REMOVE = i18n.translate('xpack.evals.deleteDatasetModal.confirmRemoveButton', {
  defaultMessage: 'Remove from this space',
});

const CHECKING_USAGE = i18n.translate('xpack.evals.deleteDatasetModal.checkingUsage', {
  defaultMessage: 'Checking experiment usage…',
});

const getConfirmLabel = (datasetName: string) =>
  i18n.translate('xpack.evals.deleteDatasetModal.confirmInputLabel', {
    defaultMessage: 'Type "{datasetName}" to confirm',
    values: { datasetName },
  });

export const DeleteDatasetModal: React.FC<DeleteDatasetModalProps> = ({
  datasetId,
  datasetName,
  examplesCount,
  spaceIds,
  onClose,
  onDeleted,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Set when the server refuses the delete the dialog described, because the
  // dataset's spaces moved on after they were read.
  const [correction, setCorrection] = useState<DatasetDeleteIntent | null>(null);
  const deleteDataset = useDeleteDataset();
  const { isShared, spaceCount } = useDatasetSharing(spaceIds);

  // Only mounted while the modal is open, so this lazily fetches the usage count.
  const { data: usageData, isLoading: isUsageLoading } = useEvaluationExperiments({
    datasetId,
    page: 1,
    perPage: 1,
  });
  const usageCount = usageData?.total ?? 0;

  // Leaving a shared dataset keeps the data, so it doesn't warrant the
  // name-typing gate an irreversible delete does.
  const isUnshare = correction ? correction === 'unshare' : isShared;

  const onConfirm = async () => {
    try {
      setError(null);
      await deleteDataset.mutateAsync({
        datasetId,
        intent: isUnshare ? 'unshare' : 'delete',
      });
      onClose();
      onDeleted?.();
    } catch (err) {
      // A refusal, not a failure: the dialog re-reads as the delete that would
      // now happen, and the user confirms that one instead.
      if (isHttpFetchError(err) && err.response?.status === 409) {
        setCorrection(isUnshare ? 'delete' : 'unshare');
        setConfirmText('');
        return;
      }

      setError(getErrorMessage(err));
    }
  };

  const isConfirmed = isUnshare || confirmText.trim() === datasetName;
  const title = isUnshare ? getRemoveTitle(datasetName) : getTitle(datasetName);

  const calloutText = (
    <>
      {correction ? <p>{correction === 'delete' ? NOW_LAST_SPACE : NOW_SHARED}</p> : null}
      {isUnshare ? (
        <>
          <p>
            {correction ? (
              // The spaces this was opened with are the ones the server just
              // said are out of date, so this says nothing about how many.
              <FormattedMessage
                id="xpack.evals.deleteDatasetModal.correctedUnshareWarning"
                defaultMessage="This removes the dataset from the current space only. Its {examplesCount, plural, one {# example stays} other {# examples stay}} available in the spaces it has since been shared with."
                values={{ examplesCount }}
              />
            ) : (
              <FormattedMessage
                id="xpack.evals.deleteDatasetModal.unshareWarning"
                defaultMessage="This removes the dataset from the current space only. Its {examplesCount, plural, one {# example stays} other {# examples stay}} available in the {remainingCount, plural, one {# other space} other {# other spaces}} it is shared with."
                values={{ examplesCount, remainingCount: spaceCount - 1 }}
              />
            )}
          </p>
        </>
      ) : (
        <p>
          <FormattedMessage
            id="xpack.evals.deleteDatasetModal.permanentWarning"
            defaultMessage="Permanently deletes this dataset and its {examplesCount, plural, one {# example} other {# examples}}."
            values={{ examplesCount }}
          />
        </p>
      )}
      {isUsageLoading ? (
        <EuiText size="s">
          <EuiLoadingSpinner size="s" /> {CHECKING_USAGE}
        </EuiText>
      ) : usageCount === 0 ? (
        <p>
          <FormattedMessage
            id="xpack.evals.deleteDatasetModal.noUsage"
            defaultMessage="No experiment runs have used this dataset yet."
          />
        </p>
      ) : isUnshare ? (
        <p>
          <FormattedMessage
            id="xpack.evals.deleteDatasetModal.unshareUsageWarning"
            defaultMessage="{usageCount, plural, one {# experiment run has} other {# experiment runs have}} used this dataset. Those results stay under Experiments, but here they will link to a dataset this space can no longer reach."
            values={{ usageCount }}
          />
        </p>
      ) : (
        <p>
          <FormattedMessage
            id="xpack.evals.deleteDatasetModal.usageWarning"
            defaultMessage="{usageCount, plural, one {# experiment run has} other {# experiment runs have}} used this dataset. Deleting it keeps those results under Experiments, but they will reference a dataset that no longer exists."
            values={{ usageCount }}
          />
        </p>
      )}
    </>
  );

  return (
    <EuiConfirmModal
      aria-label={title}
      title={title}
      onCancel={onClose}
      onConfirm={onConfirm}
      cancelButtonText={CANCEL}
      confirmButtonText={isUnshare ? CONFIRM_REMOVE : CONFIRM}
      buttonColor="danger"
      confirmButtonDisabled={!isConfirmed || deleteDataset.isLoading}
      isLoading={deleteDataset.isLoading}
    >
      <KbnWarningCallout
        title={isUnshare ? REMOVE_CALLOUT_TITLE : CALLOUT_TITLE}
        text={calloutText}
      />

      <EuiSpacer size="m" />

      {error ? (
        <>
          <EuiText color="danger" size="s">
            <p>{error}</p>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      ) : null}

      {isUnshare ? null : (
        <EuiFormRow label={getConfirmLabel(datasetName)}>
          <EuiFieldText
            autoFocus
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            isInvalid={confirmText.length > 0 && !isConfirmed}
            data-test-subj="deleteDatasetConfirmInput"
          />
        </EuiFormRow>
      )}
    </EuiConfirmModal>
  );
};
