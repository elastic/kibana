/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect } from 'react';

import { I18nContext } from 'ui/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon } from '@elastic/eui';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/data/public';

export interface ExpressionWrapperProps {
  ExpressionRenderer: ExpressionRenderer;
  expression: string;
}

export function ExpressionWrapper({
  ExpressionRenderer: ExpressionRendererComponent,
  expression,
}: ExpressionWrapperProps) {
  const [expressionError, setExpressionError] = useState<unknown>(undefined);
  useEffect(() => {
    // reset expression error if component attempts to run it again
    if (expressionError) {
      setExpressionError(undefined);
    }
  }, [expression]);
  return (
    <I18nContext>
      {expressionError ? (
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
          // TODO get the expression out of the saved vis
          expression={expression}
          onRenderFailure={(e: unknown) => {
            setExpressionError(e);
            // TODO error handling
          }}
        />
      )}
    </I18nContext>
  );
}
