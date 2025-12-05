/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiPanel, EuiSpacer, EuiTitle, EuiSelect, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { ValidationErrorType } from '../../../../utils';
import { StreamNameInput } from '../../../stream_name_input';
import type { NameStreamSectionProps } from './types';

const getValidationErrorMessage = (
  validationError: ValidationErrorType,
  conflictingIndexPattern?: string
) => {
  if (validationError === 'empty') {
    return i18n.translate(
      'xpack.createClassicStreamFlyout.nameAndConfirmStep.emptyValidationError',
      {
        defaultMessage:
          'Please supply a valid text string for all wildcards within the selected index pattern.',
      }
    );
  }

  if (validationError === 'duplicate') {
    return i18n.translate(
      'xpack.createClassicStreamFlyout.nameAndConfirmStep.duplicateValidationError',
      {
        defaultMessage: 'This stream name already exists. Please try a different name.',
      }
    );
  }

  if (validationError === 'higherPriority' && conflictingIndexPattern) {
    return [
      <FormattedMessage
        key="higherPriorityError"
        id="xpack.createClassicStreamFlyout.nameAndConfirmStep.higherPriorityValidationError"
        defaultMessage="This stream name matches a higher priority index template with index pattern {pattern}. Please alter your stream name so that it no longer conflicts, or consider changing your selected index template."
        values={{
          pattern: <strong>{conflictingIndexPattern}</strong>,
        }}
      />,
    ];
  }

  return undefined;
};

export const NameStreamSection = ({
  indexPatterns,
  selectedIndexPattern,
  onIndexPatternChange,
  onStreamNameChange,
  validationError,
  conflictingIndexPattern,
}: NameStreamSectionProps) => {
  const { euiTheme } = useEuiTheme();

  const hasMultiplePatterns = indexPatterns.length > 1;
  const currentPattern = selectedIndexPattern || indexPatterns[0] || '';

  const panelStyles = css`
    padding: ${euiTheme.size.l};
  `;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" css={panelStyles}>
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.createClassicStreamFlyout.nameAndConfirmStep.nameTitle"
            defaultMessage="Name classic stream"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />

      {/* Index pattern selector (only shown when multiple patterns exist) */}
      {hasMultiplePatterns && (
        <>
          <EuiFormRow
            label={i18n.translate(
              'xpack.createClassicStreamFlyout.nameAndConfirmStep.indexPatternLabel',
              { defaultMessage: 'Index pattern' }
            )}
            fullWidth
          >
            <EuiSelect
              options={indexPatterns.map((pattern) => ({
                value: pattern,
                text: pattern,
              }))}
              value={currentPattern}
              onChange={(e) => onIndexPatternChange(e.target.value)}
              data-test-subj="indexPatternSelect"
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Stream name inputs */}
      <EuiFormRow
        label={i18n.translate(
          'xpack.createClassicStreamFlyout.nameAndConfirmStep.streamNameLabel',
          { defaultMessage: 'Stream name' }
        )}
        fullWidth
        isInvalid={validationError !== null}
        error={getValidationErrorMessage(validationError, conflictingIndexPattern)}
        helpText={
          <FormattedMessage
            id="xpack.createClassicStreamFlyout.nameAndConfirmStep.nameHelpText"
            defaultMessage="Name your classic stream by filling in the wildcard (*) portions of the index pattern."
          />
        }
      >
        <StreamNameInput
          indexPattern={currentPattern}
          onChange={onStreamNameChange}
          validationError={validationError}
          data-test-subj="streamNameInput"
        />
      </EuiFormRow>
    </EuiPanel>
  );
};
