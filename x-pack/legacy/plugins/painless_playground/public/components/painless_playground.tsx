/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
  EuiTitle,
  EuiSpacer,
  EuiPageContent,
  EuiFlyout,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { buildRequestPayload, formatJson, getFromLocalStorage } from '../lib/helpers';
import { Request, Response } from '../common/types';
import { RightPane } from './right_pane';
import { MainControls } from './main_controls';
import { Editor } from './editor';
import { RequestFlyout } from './request_flyout';

let _mostRecentRequestId = 0;

const submit = async (code, context, contextSetup, executeCode, setResponse, setIsLoading) => {
  // Prevent an older request that resolves after a more recent request from clobbering it.
  // We store the resulting ID in this closure for comparison when the request resolves.
  const requestId = ++_mostRecentRequestId;
  setIsLoading(true);

  try {
    localStorage.setItem('painlessPlaygroundCode', code);
    localStorage.setItem('painlessPlaygroundContext', context);
    localStorage.setItem('painlessPlaygroundContextSetup', JSON.stringify(contextSetup));
    const response = await executeCode(buildRequestPayload(code, context, contextSetup));

    if (_mostRecentRequestId === requestId) {
      if (response.error) {
        setResponse({
          success: undefined,
          error: response.error,
        });
      } else {
        setResponse({
          success: response,
          error: undefined,
        });
      }
      setIsLoading(false);
    }
  } catch (error) {
    if (_mostRecentRequestId === requestId) {
      setResponse({
        success: undefined,
        error: { error },
      });
      setIsLoading(false);
    }
  }
};

const debouncedSubmit = debounce(submit, 800);

// Render a heart as an example.
const exampleScript = `
def result = '';
int charCount = 0;

int n = 10;
int threshold = n*n/2;
int dimension = 3*n/2;

for (int i = -dimension; i <= n; i++) {
  int a = -n/2-i;

  for (int j = -dimension; j <= dimension; j++) {
    int b = n/2-j;
    int c = -n/2-j;

    def isHeartVentricles = (Math.abs(i) + Math.abs(j) < n);
    def isRightAtrium = ((a * a) + (b * b) <= threshold);
    def isLeftAtrium =  ((a * a) + (c * c) <= threshold);

    if (isHeartVentricles || isRightAtrium || isLeftAtrium) {
      result += "* ";
    } else {
      result += ". ";
    }

    // Make sure the heart doesn't deform as the container changes width.
    charCount++;
    if (charCount % 31 === 0) {
      result += "\\\\n";
    }
  }
}

return result;
`;

export function PainlessPlayground({
  executeCode,
}: {
  executeCode: (payload: Request) => Promise<Response>;
}) {
  const [code, setCode] = useState(getFromLocalStorage('painlessPlaygroundCode', exampleScript));
  const [response, setResponse] = useState<Response>({ error: undefined, success: undefined });
  const [showRequestFlyout, setShowRequestFlyout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [context, setContext] = useState(
    getFromLocalStorage('painlessPlaygroundContext', 'painless_test_without_params')
  );

  const [contextSetup, setContextSetup] = useState(
    getFromLocalStorage('painlessPlaygroundContextSetup', {}, true)
  );

  // Live-update the output as the user changes the input code.
  useEffect(() => {
    debouncedSubmit(code, context, contextSetup, executeCode, setResponse, setIsLoading);
  }, [code, context, contextSetup, executeCode]);

  const toggleViewRequestFlyout = () => {
    setShowRequestFlyout(!showRequestFlyout);
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('xpack.painless_playground.title', {
                defaultMessage: 'Painless Playground',
              })}
            </h1>
          </EuiTitle>

          <Editor code={code} setCode={setCode} />
        </EuiFlexItem>

        <EuiFlexItem>
          <RightPane
            response={response}
            context={context}
            setContext={setContext}
            contextSetup={contextSetup}
            setContextSetup={setContextSetup}
            isLoading={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <MainControls
        submit={() => submit(code, context, contextSetup, executeCode, setResponse)}
        isLoading={isLoading}
        toggleFlyout={toggleViewRequestFlyout}
        isFlyoutOpen={showRequestFlyout}
      />

      {showRequestFlyout && (
        <RequestFlyout
          onClose={() => setShowRequestFlyout(false)}
          requestBody={formatJson(buildRequestPayload(code, context, contextSetup))}
          response={formatJson(response.success || response.error)}
        />
      )}
    </>
  );
}
