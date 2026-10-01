/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface DeleteDestinationConfirmationProps {
  destinationName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteDestinationConfirmation = ({
  destinationName,
  onCancel,
  onConfirm,
}: DeleteDestinationConfirmationProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'streamsDeleteDestinationTitle' });

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      title={i18n.translate('xpack.streams.destinations.deleteDestinationConfirmTitle', {
        defaultMessage: 'Delete {destinationName}?',
        values: { destinationName },
      })}
      titleProps={{ id: titleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.streams.destinations.deleteCancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.streams.destinations.deleteDestinationConfirmButtonLabel',
        { defaultMessage: 'Delete destination' }
      )}
      buttonColor="danger"
    >
      {i18n.translate('xpack.streams.destinations.deleteDestinationConfirmDescription', {
        defaultMessage: 'This permanently removes the destination from the streams unit.',
      })}
    </EuiConfirmModal>
  );
};
