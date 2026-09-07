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
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { EnrichPolicySelector } from './enrich_policy_selector';
import { EnrichOverrideToggle } from './enrich_override_toggle';

export const EnrichProcessorForm = () => {
  return (
    <>
      <EnrichPolicySelector />
      <ProcessorFieldSelector
        fieldKey="to"
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.enrichTargetFieldLabel',
          { defaultMessage: 'Target field' }
        )}
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.enrichTargetFieldHelpText',
          { defaultMessage: 'Field added to incoming documents to contain enrich data.' }
        )}
      />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreMissingToggle />
      <IgnoreFailureToggle />
      <EnrichOverrideToggle />
    </>
  );
};
