/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { isEmpty, uniq } from 'lodash';
import { useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../hooks/use_kibana';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { OptionalFieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { IgnoreFailureToggle } from '../ignore_toggles';
import {
  DateTargetField,
  DateTimezoneField,
  DateOutputFormatField,
  DateLocaleField,
} from './date_optional_fields';
import { DateFormatsField } from './date_formats_field';

import { selectPreviewDocuments } from '../../state_management/simulation_state_machine/selectors';
import {
  useStreamsEnrichmentSelector,
  useSimulatorSelector,
} from '../../state_management/stream_enrichment_state_machine';
import { DateFormState } from '../../types';

export const DateProcessorForm = () => {
  const { core, dependencies } = useKibana();
  const { toasts } = core.notifications;
  const { streamsRepositoryClient } = dependencies.start.streams;

  const form = useFormContext<DateFormState>();

  const definitionName = useStreamsEnrichmentSelector(
    (snapshot) => snapshot.context.definition.stream.name
  );
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  const applySuggestions = async ({
    fieldName,
    canSuggest = false,
  }: {
    fieldName: string;
    canSuggest: boolean;
  }) => {
    const dates = previewDocuments.map((doc) => doc[fieldName]).filter(Boolean);

    // Short-circuit if the formats is touched by the user, formats are already set, or no date samples are available
    if (!canSuggest || isEmpty(dates)) return;

    try {
      const suggestions = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/processing/_suggestions/date',
        {
          signal: null,
          params: {
            path: {
              name: definitionName,
            },
            body: {
              dates: dates as [string, ...string[]], // At least one sample is required by the API
            },
          },
        }
      );

      if (!isEmpty(suggestions.formats)) {
        const prevFormats = form.getValues('formats');
        form.setValue('formats', uniq([...prevFormats, ...suggestions.formats]));
        form.clearErrors();
      }
    } catch (error) {
      toasts.addError(new Error(error.body.message), {
        title: i18n.translate('xpack.streams.enrichment.simulation.dateSuggestionsError', {
          defaultMessage: 'An error occurred while fetching date formats suggestions.',
        }),
        toastMessage: error.body.message,
      });
    }
  };

  const handleProcessorFieldChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const fieldName = event.target.value;
    const prevFormats = form.getValues('formats');
    const hasFormats = !isEmpty(prevFormats);
    const isTouched = form.formState.touchedFields.formats;
    applySuggestions({ fieldName, canSuggest: !hasFormats || !isTouched });
  };

  const handleGenerateSuggestionClick = () => {
    const fieldName = form.getValues('field');
    applySuggestions({ fieldName, canSuggest: true });
  };

  return (
    <>
      <ProcessorFieldSelector onChange={handleProcessorFieldChange} />
      <DateFormatsField onGenerate={handleGenerateSuggestionClick} />
      <EuiSpacer size="m" />
      <OptionalFieldsAccordion>
        <DateTargetField />
        <DateTimezoneField />
        <DateLocaleField />
        <DateOutputFormatField />
        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </OptionalFieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
    </>
  );
};
