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
import useMount from 'react-use/lib/useMount';
import { StreamsAPIClientRequestParamsOf } from '@kbn/streams-plugin/public/api';
import { STREAMS_TIERED_ML_FEATURE } from '@kbn/streams-plugin/common';
import { getFormattedError } from '../../../../../util/errors';
import { useKibana } from '../../../../../hooks/use_kibana';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
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
  useStreamEnrichmentSelector,
  useSimulatorSelector,
} from '../../state_management/stream_enrichment_state_machine';
import { DateFormState } from '../../types';

type DateSuggestionsRequestSamples =
  StreamsAPIClientRequestParamsOf<'POST /internal/streams/{name}/processing/_suggestions/date'>['params']['body']['dates'];

export const DateProcessorForm = () => {
  const { core, dependencies } = useKibana();
  const { toasts } = core.notifications;
  const { streamsRepositoryClient } = dependencies.start.streams;

  const form = useFormContext<DateFormState>();

  const definition = useStreamEnrichmentSelector((snapshot) => snapshot.context.definition);
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  const applySuggestions = async ({ field }: { field: string }) => {
    // Collect sample dates from the preview documents for the selected field
    const dates = previewDocuments.map((doc) => doc[field]).filter(Boolean);

    // Short-circuit if the formats is touched by the user, formats are already set, or no date samples are available
    if (isEmpty(dates)) return;

    try {
      const suggestions = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/processing/_suggestions/date',
        {
          signal: null,
          params: {
            path: {
              name: definition.stream.name,
            },
            body: {
              dates: dates as DateSuggestionsRequestSamples, // At least one sample is required by the API
            },
          },
        }
      );

      if (!isEmpty(suggestions.formats)) {
        // Merge the suggested formats with the existing ones
        const prevFormats = form.getValues('formats');
        form.setValue('formats', uniq([...prevFormats, ...suggestions.formats]));
        form.clearErrors();
      }
    } catch (error) {
      const formattedError = getFormattedError(error);
      toasts.addError(formattedError, {
        title: i18n.translate('xpack.streams.enrichment.simulation.dateSuggestionsError', {
          defaultMessage: 'An error occurred while fetching date formats suggestions.',
        }),
        toastMessage: formattedError.message,
        toastLifeTimeMs: 5000,
      });
    }
  };

  const hasPrivileges = definition.privileges.text_structure;
  const isAvailableForTier = core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
  const areSuggestionsAvailable = hasPrivileges && isAvailableForTier;

  /**
   * When the component mounts, we want to apply suggestions if the field name is prepopulated
   * and the formats field is empty. This is to avoid overwriting user input.
   * We also check if the formats field is touched to avoid overwriting user input.
   */
  useMount(() => {
    const { field, formats } = form.getValues();
    const isTouched = form.formState.touchedFields.formats;
    if (areSuggestionsAvailable && field && isEmpty(formats) && !isTouched) {
      applySuggestions({ field });
    }
  });

  /*
   * When the processor field changes, we want to apply suggestions if the formats field is not touched
   * and the formats field is empty. This is to avoid overwriting user input.
   * The function is intentionally created depending on privileges, so that in case of no privileges
   * the component does not try to call it.
   */
  const handleProcessorFieldChange = areSuggestionsAvailable
    ? (event: React.ChangeEvent<HTMLInputElement>) => {
        const field = event.target.value;
        const prevFormats = form.getValues('formats');
        const hasFormats = !isEmpty(prevFormats);
        const isTouched = form.formState.touchedFields.formats;
        if (!hasFormats || !isTouched) {
          applySuggestions({ field });
        }
      }
    : undefined;

  /**
   * When the user clicks the "Generate" button, we want to apply suggestions
   * regardless of whether the formats field is touched or not.
   * The function is intentionally created depending on privileges, so that in case of no privileges
   * the component does not render the regenerate button.
   */
  const handleGenerateSuggestionClick = areSuggestionsAvailable
    ? () => {
        const field = form.getValues('field');
        applySuggestions({ field });
      }
    : undefined;

  return (
    <>
      <ProcessorFieldSelector onChange={handleProcessorFieldChange} />
      <DateFormatsField onGenerate={handleGenerateSuggestionClick} />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <DateTargetField />
        <DateTimezoneField />
        <DateLocaleField />
        <DateOutputFormatField />
        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
    </>
  );
};
