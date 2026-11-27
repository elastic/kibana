/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { EsqlRequestBody, EsqlResponse } from '../../../common/types';
import { useServices } from '../services';
import { i18nTexts } from '../translations';
import { ErrorCallout } from './error_callout';
import { EsqlResultsTable } from './esql_results_table';
import { EsqlVisualization } from './esql_visualization';
import { ExportButtons } from './export_buttons';

interface EsqlResultsSectionProps {
  readonly request: EsqlRequestBody;
  readonly result?: EsqlResponse;
  readonly error?: Error;
}

/** Results of an ES|QL run: chart, summary line, export buttons, and the results table. */
export function EsqlResultsSection({ request, result, error }: EsqlResultsSectionProps) {
  const { api } = useServices();

  if (error) {
    return <ErrorCallout title={i18nTexts.esqlError} error={error} />;
  }
  if (!result) {
    return null;
  }

  return (
    <>
      <EsqlVisualization request={request} columns={result.columns} />
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="indexExplorerEsqlSummary">
            {i18nTexts.esqlSummary(result.values.length, result.took)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ExportButtons onExport={(format) => api.exportEsql({ ...request, format })} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {result.isPartial ? (
        <>
          <EuiSpacer size="s" />
          <KbnWarningCallout announceOnMount size="s" title={i18nTexts.esqlPartial} />
        </>
      ) : null}
      <EuiSpacer size="s" />
      <EsqlResultsTable result={result} />
    </>
  );
}
