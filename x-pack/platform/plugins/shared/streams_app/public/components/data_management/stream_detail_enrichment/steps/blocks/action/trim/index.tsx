/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { TrimTargetField } from './trim_optional_fields';

export const TrimProcessorForm = () => {
  return (
    <>
      <ProcessorFieldSelector
        fieldKey="from"
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.trimFieldHelpText',
          { defaultMessage: 'The field to trim.' }
        )}
      />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <TrimTargetField />
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};
