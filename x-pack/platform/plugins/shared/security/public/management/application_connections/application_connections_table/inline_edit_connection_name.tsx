/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInlineEditText } from '@elastic/eui';
import type { ChangeEventHandler } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { OAUTH_CONNECTION_NAME_MAX_LENGTH } from '../../../../common/oauth';
import { labels } from '../constants/i18n';
import { useUpdateConnectionName } from '../hooks/use_update_connection_name';
import type { OAuthConnection } from '../service/application_connections_api_client';

export interface InlineEditConnectionNameProps {
  clientId: string;
  connection: OAuthConnection;
}

export const InlineEditConnectionName = ({
  clientId,
  connection,
}: InlineEditConnectionNameProps) => {
  const { name, id } = connection;
  const displayName = name ?? id;
  const [value, setValue] = useState(displayName);
  const [errors, setErrors] = useState<string[]>([]);
  const { updateConnectionName, isUpdating } = useUpdateConnectionName();
  const { services } = useKibana<CoreStart>();
  const { toasts } = services.notifications;

  // Reconcile the local input with upstream changes
  useEffect(() => {
    setValue(displayName);
  }, [displayName]);

  const hasErrors = errors.length > 0;

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    setValue(event.target.value);
    setErrors([]);
  }, []);

  const handleCancel = useCallback(() => {
    setValue(displayName);
    setErrors([]);
  }, [displayName]);

  const handleSave = useCallback(
    async (connectionName: string) => {
      const trimmed = connectionName.trim();
      if (trimmed.length === 0) {
        setErrors([labels.update.emptyValidationError]);
        return false;
      }
      if (trimmed.length > OAUTH_CONNECTION_NAME_MAX_LENGTH) {
        setErrors([labels.update.tooLongValidationError(OAUTH_CONNECTION_NAME_MAX_LENGTH)]);
        return false;
      }
      if (trimmed === displayName) {
        return true;
      }
      try {
        await updateConnectionName({
          clientId,
          connectionId: connection.id,
          name: trimmed,
        });
        toasts.addSuccess({ title: labels.update.successToast(trimmed) });
        return true;
      } catch (error) {
        toasts.addDanger({
          title: labels.update.errorToastTitle,
          text: error instanceof Error ? error.message : undefined,
        });
        return false;
      }
    },
    [clientId, connection.id, displayName, toasts, updateConnectionName]
  );

  const editModeProps = useMemo(
    () => ({
      formRowProps: { error: errors },
      inputProps: {
        'data-test-subj': `inlineEditConnectionNameInput-${connection.id}`,
      },
      saveButtonProps: {
        isDisabled: hasErrors,
        'data-test-subj': `inlineEditConnectionNameSave-${connection.id}`,
      },
      cancelButtonProps: {
        'data-test-subj': `inlineEditConnectionNameCancel-${connection.id}`,
      },
    }),
    [connection.id, errors, hasErrors]
  );

  return (
    <EuiInlineEditText
      size="s"
      inputAriaLabel={labels.update.inputAriaLabel}
      value={value}
      onChange={handleChange}
      onCancel={handleCancel}
      onSave={handleSave}
      isLoading={isUpdating}
      isInvalid={hasErrors}
      data-test-subj={`inlineEditConnectionName-${connection.id}`}
      editModeProps={editModeProps}
      readModeProps={{
        iconSize: 'm',
        'aria-label': labels.update.editAriaLabel(displayName),
      }}
    />
  );
};
