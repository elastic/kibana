/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { ProcessorFieldSelector } from '../processor_field_selector';

export const ConcatTargetField = () => {
  return (
    <ProcessorFieldSelector
      fieldKey="to"
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.concatTargetFieldLabel',
        { defaultMessage: 'Target field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.concatTargetFieldHelpText',
        { defaultMessage: 'The field that will hold the concatenated string.' }
      )}
    />
  );
};
