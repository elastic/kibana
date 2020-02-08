/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiCodeBlock, EuiPanel, EuiTabbedContent, EuiSpacer } from '@elastic/eui';

import { formatJson, formatResponse } from '../lib/helpers';
import { Response } from '../common/types';
import { Context } from './context';

export function RightPane({
  response,
  context,
  contextSetup,
  setContext,
  setContextSetup,
}: {
  response?: Response;
}) {
  return (
    <EuiPanel className="painlessPlaygroundRightPane">
      <EuiTabbedContent
        className="painlessPlaygroundRightPane__tabs"
        size="s"
        tabs={[
          {
            id: 'output',
            name: 'Output',
            content: (
              <>
                <EuiSpacer size="m" />
                <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                  {formatResponse(response)}
                </EuiCodeBlock>
              </>
            ),
          },
          {
            id: 'settings',
            name: 'Context',
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
