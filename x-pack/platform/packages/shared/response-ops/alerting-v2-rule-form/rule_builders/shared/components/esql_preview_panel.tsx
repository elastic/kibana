/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { QueryResultsGrid } from '../../../form/fields/query_results_grid';
import type { QueryResultsGridProps } from '../../../form/fields/query_results_grid';

interface EsqlPreviewPanelProps extends QueryResultsGridProps {
  query: string;
}

export const EsqlPreviewPanel = (props: EsqlPreviewPanelProps) => {
  const { query } = props;

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.alertingV2.ruleBuilder.preview.generatedQueryLabel', {
          defaultMessage: 'Generated ES|QL query',
        })}
        fullWidth
      >
        {query ? (
          <EuiCodeBlock language="esql" paddingSize="m" fontSize="m" isCopyable>
            {query}
          </EuiCodeBlock>
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.alertingV2.ruleBuilder.preview.emptyQueryState', {
              defaultMessage: 'Fill in the form fields to generate an ES|QL query.',
            })}
          </EuiText>
        )}
      </EuiFormRow>

      <EuiSpacer size="m" />

      <QueryResultsGrid {...props} />
    </>
  );
};
