/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { SchemaEditorProps, SchemaField } from './types';

export const UnpromoteFieldModal = ({
  field,
  onClose,
  onFieldUnmap,
}: {
  field: SchemaField;
  onClose: () => void;
  onFieldUnmap: SchemaEditorProps['onFieldUnmap'];
}) => {
  const [{ loading }, unmapField] = useAsyncFn(async () => {
    await onFieldUnmap(field.name);
    if (onClose) onClose();
  }, [field, onClose, onFieldUnmap]);

  return (
    <EuiConfirmModal
      isLoading={loading}
      title={field.name}
      onCancel={onClose}
      onConfirm={unmapField}
      cancelButtonText={i18n.translate(
        'xpack.streams.unpromoteFieldModal.unpromoteFieldButtonCancelLabel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.streams.unpromoteFieldModal.unpromoteFieldButtonLabel',
        { defaultMessage: 'Unmap field' }
      )}
      buttonColor="danger"
    >
      {i18n.translate('xpack.streams.unpromoteFieldModal.unpromoteFieldWarning', {
        defaultMessage: 'Are you sure you want to unmap this field from template mappings?',
      })}
    </EuiConfirmModal>
  );
};
