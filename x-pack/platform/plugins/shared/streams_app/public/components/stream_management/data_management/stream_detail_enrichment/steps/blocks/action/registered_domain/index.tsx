/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { PrefixField } from './prefix_field';

export const RegisteredDomainProcessorForm = () => {
  return (
    <>
      <ProcessorFieldSelector
        fieldKey="expression"
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.registeredDomainExpressionLabel',
          {
            defaultMessage: 'Field',
          }
        )}
      />
      <EuiSpacer size="m" />
      <PrefixField />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreMissingToggle />
      <IgnoreFailureToggle />
    </>
  );
};
