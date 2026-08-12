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
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useDeleteDataset, useEvaluationExperiments } from '../hooks/use_evals_api';
import { useDatasetSharing } from './dataset_spaces';

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

const ALL_SPACES_CALLOUT_TITLE = i18n.translate(
  'xpack.evals.deleteDatasetModal.allSpacesCalloutTitle',
  {
    defaultMessage: 'This dataset is in every space',
  }
);

const REMOVE_CALLOUT_TITLE = i18n.translate('xpack.evals.deleteDatasetModal.removeCalloutTitle', {
  defaultMessage: 'The dataset stays in its other spaces',
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
  const deleteDataset = useDeleteDataset();
  const { isShared, isGlobal, spaceCount, otherSpaceNames, hiddenSpaceCount } =
    useDatasetSharing(spaceIds);

  // Only mounted while the modal is open, so this lazily fetches the usage count.
  const { data: usageData, isLoading: isUsageLoading } = useEvaluationExperiments({
    datasetId,
    page: 1,
    perPage: 1,
  });
  const usageCount = usageData?.total ?? 0;

  // Leaving a shared dataset keeps the data, so it doesn't warrant the
  // name-typing gate an irreversible delete does.
  const isUnshare = isShared && !isGlobal;

  const onConfirm = async () => {
    try {
      setError(null);
      await deleteDataset.mutateAsync({ datasetId });
      onClose();
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const isConfirmed = isUnshare || confirmText.trim() === datasetName;
  const title = isUnshare ? getRemoveTitle(datasetName) : getTitle(datasetName);

  const getCalloutTitle = () => {
    if (isUnshare) return REMOVE_CALLOUT_TITLE;
    if (isGlobal) return ALL_SPACES_CALLOUT_TITLE;
    return CALLOUT_TITLE;
  };

  const calloutText = (
    <>
      {isUnshare ? (
        <>
          <p>
            <FormattedMessage
              id="xpack.evals.deleteDatasetModal.unshareWarning"
              defaultMessage="This removes the dataset from the current space only. Its {examplesCount, plural, one {# example stays} other {# examples stay}} available in the {remainingCount, plural, one {# other space} other {# other spaces}} it belongs to."
              values={{ examplesCount, remainingCount: spaceCount - 1 }}
            />
          </p>
          {otherSpaceNames.length > 0 ? (
            <p>
              <FormattedMessage
                id="xpack.evals.deleteDatasetModal.remainingSpaces"
                defaultMessage="It stays in {spaceNames}."
                values={{ spaceNames: otherSpaceNames.join(', ') }}
              />
            </p>
          ) : null}
          {hiddenSpaceCount > 0 ? (
            <p>
              <FormattedMessage
                id="xpack.evals.deleteDatasetModal.remainingHiddenSpaces"
                defaultMessage="It stays in {hiddenSpaceCount, plural, one {# space} other {# spaces}} you do not have access to."
                values={{ hiddenSpaceCount }}
              />
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p>
            <FormattedMessage
              id="xpack.evals.deleteDatasetModal.permanentWarning"
              defaultMessage="Permanently deletes this dataset and its {examplesCount, plural, one {# example} other {# examples}}."
              values={{ examplesCount }}
            />
          </p>
          {isGlobal ? (
            <p>
              <FormattedMessage
                id="xpack.evals.deleteDatasetModal.allSpacesWarning"
                defaultMessage="It is available in every space, so it disappears for everyone, not just here."
              />
            </p>
          ) : null}
        </>
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
      <KbnWarningCallout title={getCalloutTitle()} text={calloutText} />

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
