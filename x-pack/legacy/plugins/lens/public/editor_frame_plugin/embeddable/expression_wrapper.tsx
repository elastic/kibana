/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect } from 'react';

import { I18nProvider } from '@kbn/i18n/react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon } from '@elastic/eui';
import { TimeRange } from 'src/plugins/data/public';
import { Query } from 'src/legacy/core_plugins/data/public';
import { Filter } from '@kbn/es-query';
import { ExpressionRenderer } from 'src/legacy/core_plugins/expressions/public';

export interface ExpressionWrapperProps {
  ExpressionRenderer: ExpressionRenderer;
  expression: string;
  context: {
    timeRange?: TimeRange;
    query?: Query;
    filters?: Filter[];
    lastReloadRequestTime?: number;
  };
}

export function ExpressionWrapper({
  ExpressionRenderer: ExpressionRendererComponent,
  expression,
  context,
}: ExpressionWrapperProps) {
  const [expressionError, setExpressionError] = useState<unknown>(undefined);
  useEffect(() => {
    // reset expression error if component attempts to run it again
    if (expressionError) {
      setExpressionError(undefined);
    }
  }, [expression, context]);
  return (
    <I18nProvider>
      {expression === '' || expressionError ? (
        <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
          <EuiFlexItem>
            <EuiIcon type="alert" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.lens.embeddable.failure"
                defaultMessage="Visualization couldn't be displayed"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <ExpressionRendererComponent
          className="lnsExpressionRenderer"
          expression={expression}
          onRenderFailure={(e: unknown) => {
            setExpressionError(e);
          }}
          searchContext={{ ...context, type: 'kibana_context' }}
        />
      )}
    </I18nProvider>
  );
}
