/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DESTINATION_INDEX_LABEL,
  DESTINATION_INDEX_PATTERNS_LABEL,
} from './destination_type_config';
import { indexUsesTemplate } from './destination_models';
import type { DestinationCreationFormErrors } from './types';

interface LocalElasticsearchFieldsProps {
  index: string;
  indexPatterns: string;
  indexError?: DestinationCreationFormErrors['index'];
  indexPatternsError?: DestinationCreationFormErrors['indexPatterns'];
  disabled: boolean;
  onIndexChange: (index: string) => void;
  onIndexPatternsChange: (indexPatterns: string) => void;
  onBlur: () => void;
}

const indexErrorText = (error: DestinationCreationFormErrors['index']) =>
  error === 'required'
    ? i18n.translate('xpack.streams.destinations.indexRequiredErrorMessage', {
        defaultMessage: 'Enter an index or data stream name.',
      })
    : undefined;

const indexPatternsErrorText = (error: DestinationCreationFormErrors['indexPatterns']) => {
  if (error === 'required') {
    return i18n.translate('xpack.streams.destinations.indexPatternsRequiredErrorMessage', {
      defaultMessage: 'Enter at least one index pattern. Index templates require index patterns.',
    });
  }
  if (error === 'invalid') {
    return i18n.translate('xpack.streams.destinations.indexPatternsInvalidErrorMessage', {
      defaultMessage: 'Index patterns must be unique.',
    });
  }
  return undefined;
};

/** Fields for a local Elasticsearch destination (`elasticsearch.schema.yaml`). */
export const LocalElasticsearchFields = ({
  index,
  indexPatterns,
  indexError,
  indexPatternsError,
  disabled,
  onIndexChange,
  onIndexPatternsChange,
  onBlur,
}: LocalElasticsearchFieldsProps) => {
  const indexErrorMessage = indexErrorText(indexError);
  const showIndexPatterns = indexUsesTemplate(index);
  const indexPatternsErrorMessage = showIndexPatterns
    ? indexPatternsErrorText(indexPatternsError)
    : undefined;

  return (
    <>
      <EuiFormRow
        fullWidth
        label={DESTINATION_INDEX_LABEL}
        helpText={i18n.translate('xpack.streams.destinations.indexHelpDescription', {
          defaultMessage:
            'Static name or Mustache template for the index or data stream this destination writes to.',
        })}
        isInvalid={Boolean(indexErrorMessage)}
        error={indexErrorMessage}
      >
        <EuiFieldText
          fullWidth
          value={index}
          disabled={disabled}
          isInvalid={Boolean(indexErrorMessage)}
          onChange={(event) => onIndexChange(event.target.value)}
          onBlur={onBlur}
          data-test-subj="streamsCreateDestinationIndex"
        />
      </EuiFormRow>
      {showIndexPatterns && (
        <EuiFormRow
          fullWidth
          label={DESTINATION_INDEX_PATTERNS_LABEL}
          helpText={i18n.translate('xpack.streams.destinations.indexPatternsHelpDescription', {
            defaultMessage: 'One pattern per line. A Mustache index requires index patterns.',
          })}
          isInvalid={Boolean(indexPatternsErrorMessage)}
          error={indexPatternsErrorMessage}
        >
          <EuiTextArea
            fullWidth
            value={indexPatterns}
            disabled={disabled}
            isInvalid={Boolean(indexPatternsErrorMessage)}
            onChange={(event) => onIndexPatternsChange(event.target.value)}
            onBlur={onBlur}
            rows={3}
            placeholder={i18n.translate('xpack.streams.destinations.indexPatternsPlaceholder', {
              defaultMessage: 'logs-*-*',
            })}
            data-test-subj="streamsCreateDestinationIndexPatterns"
          />
        </EuiFormRow>
      )}
    </>
  );
};
