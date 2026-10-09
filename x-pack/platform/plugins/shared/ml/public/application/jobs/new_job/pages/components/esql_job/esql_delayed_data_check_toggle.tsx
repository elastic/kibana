/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface EsqlDelayedDataCheckToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  hasSummaryCountField: boolean;
}

/**
 * Toggle for `datafeed.delayed_data_check_config.enabled`. Forced off (and
 * disabled, with an inline hint) when no summary count field is selected,
 * because ES rejects an esql_query datafeed with delayed-data checking
 * enabled and no `summary_count_field_name`. Standalone (props-in,
 * onChange-out) so it can be reused by the staged PICK_FIELDS wizard step.
 */
export const EsqlDelayedDataCheckToggle = ({
  enabled,
  onChange,
  hasSummaryCountField,
}: EsqlDelayedDataCheckToggleProps) => (
  <EuiFormRow
    helpText={
      hasSummaryCountField
        ? undefined
        : i18n.translate('xpack.ml.esqlJob.query.delayedDataCheckDisabledHelpText', {
            defaultMessage:
              'Select a summary count field to turn on delayed-data detection. Elasticsearch rejects an ES|QL datafeed with delayed-data checking enabled and no summary count field.',
          })
    }
    fullWidth
  >
    <EuiSwitch
      label={i18n.translate('xpack.ml.esqlJob.query.delayedDataCheckLabel', {
        defaultMessage: 'Check for delayed data',
      })}
      checked={enabled && hasSummaryCountField}
      onChange={(event) => onChange(event.target.checked)}
      disabled={!hasSummaryCountField}
      data-test-subj="mlEsqlDelayedDataCheckToggle"
    />
  </EuiFormRow>
);
