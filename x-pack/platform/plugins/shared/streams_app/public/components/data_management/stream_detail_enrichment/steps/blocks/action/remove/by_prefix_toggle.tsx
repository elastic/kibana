/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useController, useWatch } from 'react-hook-form';
import { EuiFormRow, EuiSwitch, EuiToolTip, htmlIdGenerator } from '@elastic/eui';
import type { RemoveFormState } from '../../../../types';

export const ByPrefixToggle = () => {
  const { field } = useController<RemoveFormState, 'by_prefix'>({
    name: 'by_prefix',
  });

  const where = useWatch<RemoveFormState, 'where'>({ name: 'where' });
  const hasCondition = where && !('always' in where);
  const isDisabled = hasCondition && !field.value;

  const switchComponent = (
    <EuiSwitch
      id={createId()}
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeByPrefixLabel',
        {
          defaultMessage: 'Remove by prefix',
        }
      )}
      checked={field.value ?? false}
      onChange={(e) => field.onChange(e.target.checked)}
      disabled={isDisabled}
      compressed
    />
  );

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
      {isDisabled ? (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeByPrefixDisabledTooltip',
            {
              defaultMessage:
                'Remove by prefix cannot be used with conditional removal. Clear the condition first to enable this option.',
            }
          )}
        >
          {switchComponent}
        </EuiToolTip>
      ) : (
        switchComponent
      )}
    </EuiFormRow>
  );
};

const createId = htmlIdGenerator();
