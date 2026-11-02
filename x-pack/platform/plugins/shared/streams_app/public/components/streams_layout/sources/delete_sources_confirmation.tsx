/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface DeleteSourcesConfirmationProps {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteSourcesConfirmation = ({
  count,
  onCancel,
  onConfirm,
}: DeleteSourcesConfirmationProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'streamsDeleteSourcesTitle' });
  const title = i18n.translate('xpack.streams.sources.deleteSourcesConfirmTitle', {
    defaultMessage: 'Delete {count, plural, one {source} other {# sources}}?',
    values: { count },
  });

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      title={title}
      titleProps={{ id: titleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.streams.sources.deleteCancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.streams.sources.deleteSourcesConfirmButtonLabel', {
        defaultMessage: 'Delete {count, plural, one {source} other {# sources}}',
        values: { count },
      })}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      data-test-subj="streamsDeleteSourcesConfirmation"
    >
      <p>
        {i18n.translate('xpack.streams.sources.deleteSourcesConfirmDescription', {
          defaultMessage:
            '{count, plural, one {This will permanently remove the source} other {This will permanently remove the selected sources}}.',
          values: { count },
        })}
      </p>
    </EuiConfirmModal>
  );
};
