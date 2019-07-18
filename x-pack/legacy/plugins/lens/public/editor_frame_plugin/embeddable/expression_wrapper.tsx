/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect, useMemo } from 'react';

import { I18nProvider } from '@kbn/i18n/react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon } from '@elastic/eui';
import { TimeRange } from 'ui/timefilter/time_history';
import { Query } from 'src/legacy/core_plugins/data/public';
import { Filter } from '@kbn/es-query';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/data/public';
import { prependKibanaContext } from '../../editor_frame_plugin/editor_frame/expression_helpers';

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
  const contextualizedExpression = useMemo(() => prependKibanaContext(expression, context), [
    expression,
    context,
  ]);
  useEffect(() => {
    // reset expression error if component attempts to run it again
    if (expressionError) {
      setExpressionError(undefined);
    }
  }, [contextualizedExpression]);
  return (
    <I18nProvider>
      {contextualizedExpression === null || expressionError ? (
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
          className="lnsExpressionOutput"
          expression={contextualizedExpression}
          onRenderFailure={(e: unknown) => {
            setExpressionError(e);
          }}
        />
      )}
    </I18nProvider>
  );
}
