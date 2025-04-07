/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiCode, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const DateTargetField = () => {
  const { register } = useFormContext();
  const { ref, ...inputProps } = register('target_field');

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateTargetLabel',
        { defaultMessage: 'Target field' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dateTargetHelpText"
          defaultMessage="The field that will hold the parsed date. Defaults to {target}."
          values={{ target: <EuiCode>@timestamp</EuiCode> }}
        />
      }
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};

export const DateTimezoneField = () => {
  const { register } = useFormContext();
  const { ref, ...inputProps } = register('timezone');

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateTimezoneLabel',
        { defaultMessage: 'Timezone' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dateTimezoneHelpText"
          defaultMessage="The timezone to use when parsing the date. Supports template snippets. Defaults to {timezone}"
          values={{ timezone: <EuiCode>UTC</EuiCode> }}
        />
      }
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};

export const DateLocaleField = () => {
  const { register } = useFormContext();
  const { ref, ...inputProps } = register('locale');

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateLocaleLabel',
        { defaultMessage: 'Locale' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dateLocaleHelpText"
          defaultMessage="The locale to use when parsing the date, relevant when parsing month names or week days. Supports template snippets. Defaults to {locale}."
          values={{ locale: <EuiCode>ENGLISH</EuiCode> }}
        />
      }
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};

export const DateOutputFormatField = () => {
  const { register } = useFormContext();
  const { ref, ...inputProps } = register('output_format');

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dateOutputFormatLabel',
        { defaultMessage: 'Output format' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dateOutputFormatHelpText"
          defaultMessage="The format to use when writing the date to {field}. Must be a valid java time pattern. Defaults to {outputFormat}."
          values={{
            field: <EuiCode>target_field</EuiCode>,
            outputFormat: <EuiCode>yyyy-MM-dd&apos;T&apos;HH:mm:ss.SSSXXX</EuiCode>,
          }}
        />
      }
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};
