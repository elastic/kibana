/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { EuiFormRow, EuiSwitch, htmlIdGenerator } from '@elastic/eui';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type { RemoveFormState } from '../../../../types';

export const ByPrefixToggle = () => {
  const { field } = useController<RemoveFormState, 'by_prefix'>({
    name: 'by_prefix',
  });

  const { setValue } = useFormContext<RemoveFormState>();
  const where = useWatch<RemoveFormState, 'where'>({ name: 'where' });
  const hasCondition = where && !('always' in where);

  const handleChange = (checked: boolean) => {
    field.onChange(checked);
    // If enabling by_prefix and there's a condition, clear it
    if (checked && hasCondition) {
      setValue('where', ALWAYS_CONDITION);
    }
  };

  return (
    <EuiFormRow
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeByPrefixHelpText',
        {
          defaultMessage:
            'When enabled, removes the field and all its nested fields (field.*). Cannot be used with conditional removal.',
        }
      )}
      fullWidth
      describedByIds={[createId()]}
    >
      <EuiSwitch
        id={createId()}
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeByPrefixLabel',
          {
            defaultMessage: 'Remove by prefix',
          }
        )}
        checked={field.value ?? false}
        onChange={(e) => handleChange(e.target.checked)}
        compressed
      />
    </EuiFormRow>
  );
};

const createId = htmlIdGenerator();
