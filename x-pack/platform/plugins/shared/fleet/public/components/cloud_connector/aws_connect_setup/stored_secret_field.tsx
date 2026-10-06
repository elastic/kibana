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
 * Tracks which of the fields that already have a stored secret the user chose to replace.
 * A field is "stored" until Replace is clicked; its value is then entered like any other field.
 */
export function useStoredSecretFields<TField extends string>(
  storedSecretFields: ReadonlyArray<TField> | undefined
) {
  const [replaced, setReplaced] = useState<ReadonlySet<TField>>(new Set());

  const isStored = useCallback(
    (field: TField) => !!storedSecretFields?.includes(field) && !replaced.has(field),
    [storedSecretFields, replaced]
  );
  const replace = useCallback(
    (field: TField) => setReplaced((prev) => new Set(prev).add(field)),
    []
  );

  return { isStored, replace };
}

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
