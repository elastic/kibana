/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiFormRow, EuiSelect } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { SortTargetFieldSelector } from './target_field';
import type { SortFormState } from '../../../../types';

const SORT_ORDER_OPTIONS = [
  {
    value: 'asc',
    text: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.sortOrderAsc',
      { defaultMessage: 'Ascending' }
    ),
  },
  {
    value: 'desc',
    text: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.sortOrderDesc',
      { defaultMessage: 'Descending' }
    ),
  },
];

export const SortProcessorForm = () => {
  const { field: orderField } = useController<SortFormState, 'order'>({
    name: 'order',
  });

  return (
    <>
      <ProcessorFieldSelector
        fieldKey="from"
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.sortFieldHelpText',
          { defaultMessage: 'The array field to sort.' }
        )}
      />
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.sortOrderLabel',
          { defaultMessage: 'Order' }
        )}
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.sortOrderHelpText',
          { defaultMessage: 'Sort order for the array elements.' }
        )}
        fullWidth
      >
        <EuiSelect
          options={SORT_ORDER_OPTIONS}
          value={orderField.value || 'asc'}
          onChange={(e) => orderField.onChange(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <SortTargetFieldSelector />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};
