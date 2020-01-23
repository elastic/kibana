/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiCodeBlock, EuiPanel, EuiTabbedContent, EuiSpacer } from '@elastic/eui';

import { formatJson, formatResponse } from '../lib/helpers';
import { Response } from '../common/types';

export function Output({ response }: { response: Response }) {
  return (
    <EuiTabbedContent
      size="s"
      tabs={[
        {
          id: 'output',
          name: 'Output',
          content: (
            <>
              <EuiSpacer size="s" />
              <EuiPanel>
                <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                  {formatResponse(response)}
                </EuiCodeBlock>
              </EuiPanel>
            </>
          ),
        },
        {
          id: 'request',
          name: 'Response',
          content: (
            <>
              <EuiSpacer size="s" />
              <EuiPanel>
                <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                  {formatJson(response)}
                </EuiCodeBlock>
              </EuiPanel>
            </>
          ),
        },
      ]}
    />
  );
}
