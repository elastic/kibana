/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { useWatch } from 'react-hook-form';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { ByPrefixToggle } from './by_prefix_toggle';
import { useStreamEnrichmentSelector } from '../../../../state_management/stream_enrichment_state_machine';
import { isStepUnderEdit } from '../../../../state_management/steps_state_machine';
import type { RemoveFormState } from '../../../../types';

export const RemoveProcessorForm = () => {
  const isWithinWhereBlock = useStreamEnrichmentSelector((state) => {
    const stepUnderEdit = state.context.stepRefs.find((stepRef) =>
      isStepUnderEdit(stepRef.getSnapshot())
    );
    return stepUnderEdit ? stepUnderEdit.getSnapshot().context.step.parentId !== null : false;
  });

  const byPrefix = useWatch<RemoveFormState, 'by_prefix'>({ name: 'by_prefix' });

  return (
    <>
      <ProcessorFieldSelector
        fieldKey="from"
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeFieldHelpText',
          {
            defaultMessage:
              'The field to be removed. When "Remove by prefix" is enabled, all nested fields (field.*) will also be removed.',
          }
        )}
      />
      {!isWithinWhereBlock && <ByPrefixToggle />}
      <EuiSpacer size="m" />
      <FieldsAccordion>
        {!byPrefix && <ProcessorConditionEditor />}
        {byPrefix && (
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeByPrefixNoConditionMessage',
              {
                defaultMessage:
                  'Conditional removal is not available when "Remove by prefix" is enabled.',
              }
            )}
          </p>
        )}
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};
