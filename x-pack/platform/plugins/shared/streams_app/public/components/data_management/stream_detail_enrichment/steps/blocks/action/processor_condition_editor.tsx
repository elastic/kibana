/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { isConditionComplete } from '@kbn/streamlang';
import { i18n } from '@kbn/i18n';
import type { ProcessorFormState } from '../../../types';
import { ProcessorConditionEditorWrapper } from '../../../processor_condition_editor';

export const ProcessorConditionEditor = () => {
  const { field } = useController<ProcessorFormState, 'where'>({
    name: 'where',
    rules: {
      validate: isConditionComplete,
    },
  });
  const { setError, clearErrors } = useFormContext<ProcessorFormState>();

  const handleValidityChange = useCallback(
    (isValid: boolean) => {
      if (isValid) {
        clearErrors('where');
        return;
      }

      setError('where', {
        type: 'manual',
        message: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.invalidProcessorWhereJsonError',
          { defaultMessage: 'Invalid JSON' }
        ),
      });
    },
    [clearErrors, setError]
  );

  if (field.value === undefined) {
    return null;
  }

  return (
    <ProcessorConditionEditorWrapper
      condition={field.value}
      onConditionChange={field.onChange}
      onValidityChange={handleValidityChange}
    />
  );
};
