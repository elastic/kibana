/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const STORED_SECRET_PLACEHOLDER = '••••••••';

/**
 * Tracks whether the user chose to replace the stored secrets. The credentials of a form belong
 * together (an access key id only works with its own secret access key and session token), so
 * Replace on any stored field replaces all of them, and each replaced field then needs a new
 * value. Cancelling goes back to keeping every stored secret.
 *
 * A stored field that already has a value in `initialValues` was replaced earlier (the form was
 * unmounted and is mounting again), so the form starts as replaced and keeps those values.
 */
export function useStoredSecretFields<TField extends string>(
  storedSecretFields: ReadonlyArray<TField> | undefined,
  initialValues?: Partial<Record<TField, string>>
) {
  const [isReplaced, setIsReplaced] = useState<boolean>(() =>
    (storedSecretFields ?? []).some((field) => !!initialValues?.[field])
  );

  const isStored = useCallback(
    (field: TField) => !!storedSecretFields?.includes(field) && !isReplaced,
    [storedSecretFields, isReplaced]
  );
  const replace = useCallback(() => setIsReplaced(true), []);
  const cancel = useCallback(() => setIsReplaced(false), []);

  return {
    isStored,
    replace,
    cancel,
    /** True while stored secrets are being replaced, so the user can still back out. */
    canCancel: isReplaced && !!storedSecretFields && storedSecretFields.length > 0,
  };
}

interface CancelReplaceButtonProps {
  onCancel: () => void;
  'data-test-subj': string;
}

/** Goes back to keeping the stored secrets after Replace was clicked. */
export const CancelReplaceButton: React.FC<CancelReplaceButtonProps> = ({
  onCancel,
  'data-test-subj': dataTestSubj,
}) => (
  <EuiButtonEmpty size="xs" onClick={onCancel} data-test-subj={`${dataTestSubj}-cancelReplace`}>
    {i18n.translate('xpack.fleet.storedSecretField.cancelReplaceButton', {
      defaultMessage: 'Keep the stored secrets',
    })}
  </EuiButtonEmpty>
);

interface StoredSecretFieldProps {
  onReplace: () => void;
  'data-test-subj': string;
}

/** Read-only placeholder shown instead of an input while a secret is stored and not replaced. */
export const StoredSecretField: React.FC<StoredSecretFieldProps> = ({
  onReplace,
  'data-test-subj': dataTestSubj,
}) => (
  <EuiFieldText
    fullWidth
    disabled
    value={STORED_SECRET_PLACEHOLDER}
    aria-label={i18n.translate('xpack.fleet.storedSecretField.ariaLabel', {
      defaultMessage: 'Stored secret',
    })}
    append={
      <EuiButtonEmpty
        size="xs"
        iconType="refresh"
        onClick={onReplace}
        data-test-subj={`${dataTestSubj}-replace`}
      >
        {i18n.translate('xpack.fleet.storedSecretField.replaceButton', {
          defaultMessage: 'Replace',
        })}
      </EuiButtonEmpty>
    }
    data-test-subj={`${dataTestSubj}-stored`}
  />
);
