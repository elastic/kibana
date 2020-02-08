/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTabbedContent,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { formatJson, formatResponse } from '../lib/helpers';
import { Response } from '../common/types';
import { Context } from './context';

export function RightPane({
  response,
  context,
  contextSetup,
  setContext,
  setContextSetup,
  isLoading,
}: {
  response?: Response;
}) {
  const outputTabLabel = (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        {isLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : response.error ? (
          <EuiIcon type="alert" color="danger" />
        ) : (
          <EuiIcon type="check" color="secondary" />
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.painless_playground.outputTabLabel', {
          defaultMessage: 'Output',
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPanel className="painlessPlaygroundRightPane">
      <EuiTabbedContent
        className="painlessPlaygroundRightPane__tabs"
        size="s"
        tabs={[
          {
            id: 'output',
            name: outputTabLabel,
            content: (
              <>
                <EuiSpacer size="m" />
                <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                  {formatResponse(response.success || response.error)}
                </EuiCodeBlock>
              </>
            ),
          },
          {
            id: 'settings',
            name: (
              <span>
                {i18n.translate('xpack.painless_playground.contextTabLabel', {
                  defaultMessage: 'Context',
                })}
              </span>
            ),
            content: (
              <>
                <EuiSpacer size="m" />
                <Context
                  context={context}
                  contextSetup={contextSetup}
                  setContext={setContext}
                  setContextSetup={setContextSetup}
                />
              </>
            ),
          },
        ]}
      />
    </EuiPanel>
  );
}
