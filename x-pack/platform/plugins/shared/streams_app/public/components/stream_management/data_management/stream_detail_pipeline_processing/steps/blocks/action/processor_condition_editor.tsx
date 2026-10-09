/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFormRow, EuiLink, EuiTextArea, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useController } from 'react-hook-form';
import { useKibana } from '../../../../../../../hooks/use_kibana';
import type { ProcessorFormState } from '../../../types';

const conditionLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.processor.conditionLabel',
  { defaultMessage: 'Condition (optional)' }
);

const CONDITION_EXAMPLE = "ctx.level == 'debug'";

const CONDITION_ROWS = 3;

export const ProcessorConditionEditor = () => {
  const { euiTheme } = useEuiTheme();
  const {
    core: { docLinks },
  } = useKibana();

  const { field } = useController<ProcessorFormState, 'if'>({ name: 'if' });

  if (field.value !== undefined && typeof field.value !== 'string') {
    return null;
  }

  return (
    <EuiFormRow
      label={conditionLabel}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.conditionHelpText"
          defaultMessage="A {painlessLink} expression. The processor only runs on documents where it evaluates to true, for example {example}."
          values={{
            painlessLink: (
              <EuiLink
                data-test-subj="streamsAppProcessorConditionDocsLink"
                external
                target="_blank"
                href={docLinks.links.ingest.conditionalProcessor}
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processor.conditionPainlessLinkLabel',
                  { defaultMessage: 'Painless' }
                )}
              </EuiLink>
            ),
            example: <EuiCode>{CONDITION_EXAMPLE}</EuiCode>,
          }}
        />
      }
      fullWidth
    >
      <EuiTextArea
        data-test-subj="streamsAppProcessorConditionField"
        name={field.name}
        value={field.value ?? ''}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
        inputRef={field.ref}
        placeholder={CONDITION_EXAMPLE}
        aria-label={conditionLabel}
        rows={CONDITION_ROWS}
        resize="vertical"
        compressed
        fullWidth
        css={css`
          font-family: ${euiTheme.font.familyCode};
        `}
      />
    </EuiFormRow>
  );
};
