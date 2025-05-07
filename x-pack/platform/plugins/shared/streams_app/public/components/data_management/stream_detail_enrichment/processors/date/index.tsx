/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { isEmpty, uniq } from 'lodash';
import { useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { getFormattedError } from '../../../../../util/errors';
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

  const definition = useStreamsEnrichmentSelector((snapshot) => snapshot.context.definition);
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  const applySuggestions = async ({ fieldName }: { fieldName: string }) => {
    const dates = previewDocuments.map((doc) => doc[fieldName]).filter(Boolean);

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

  useEffect(() => {
    const { field: fieldName, formats } = form.getValues();
    const isTouched = form.formState.touchedFields.formats;
    if (fieldName && isEmpty(formats) && !isTouched) {
      applySuggestions({ fieldName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProcessorFieldChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const fieldName = event.target.value;
    const prevFormats = form.getValues('formats');
    const hasFormats = !isEmpty(prevFormats);
    const isTouched = form.formState.touchedFields.formats;
    if (!hasFormats || !isTouched) {
      applySuggestions({ fieldName });
    }
  };

  const handleGenerateSuggestionClick = definition.privileges.text_structure
    ? () => {
        const fieldName = form.getValues('field');
        applySuggestions({ fieldName });
      }
    : undefined;

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
