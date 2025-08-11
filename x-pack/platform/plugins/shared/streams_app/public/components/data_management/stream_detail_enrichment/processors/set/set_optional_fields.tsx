/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ToggleField } from '../toggle_field';
import { ExtractBooleanFields, ProcessorFormState } from '../../types';

export const OverrideField = () => {
  return (
    <ToggleField
      name={'override' as ExtractBooleanFields<ProcessorFormState>}
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setOverrideLabel',
        { defaultMessage: 'Override' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setOverrideHelpText"
          defaultMessage="If true, the processor will update fields with pre-existing non-null field values. If false, non-null fields are not updated."
        />
      }
    />
  );
};
