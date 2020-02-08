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
import { Output } from './output';
import { MainControls } from './main_controls';
import { Editor } from './editor';

let _mostRecentRequestId = 0;

const submit = async (code, context, contextSetup, executeCode, setResponse) => {
  // Prevent an older request that resolves after a more recent request from clobbering it.
  // We store the resulting ID in this closure for comparison when the request resolves.
  const requestId = ++_mostRecentRequestId;

  try {
    localStorage.setItem('painlessPlaygroundCode', code);
    localStorage.setItem('painlessPlaygroundContext', context);
    localStorage.setItem('painlessPlaygroundContextSetup', JSON.stringify(contextSetup));
    const res = await executeCode(buildRequestPayload(code, context, contextSetup));

    if (_mostRecentRequestId === requestId) {
      setResponse(res);
    }
  } catch (error) {
    if (_mostRecentRequestId === requestId) {
      setResponse({
        error,
      });
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

  const [response, setResponse] = useState<Response>({});

  const [context, setContext] = useState(
    getFromLocalStorage('painlessPlaygroundContext', 'painless_test_without_params')
  );

  const [contextSetup, setContextSetup] = useState(
    getFromLocalStorage('painlessPlaygroundContextSetup', {}, true)
  );

  const [showRequestFlyout, setShowRequestFlyout] = useState(false);

  // Live-update the output as the user changes the input code.
  useEffect(() => {
    debouncedSubmit(code, context, contextSetup, executeCode, setResponse);
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
          <Output
            response={response}
            context={context}
            setContext={setContext}
            contextSetup={contextSetup}
            setContextSetup={setContextSetup}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <MainControls
        submit={() => submit(code, context, contextSetup, executeCode, setResponse)}
        disabled={code.trim() === ''}
        toggleFlyout={toggleViewRequestFlyout}
        isFlyoutOpen={showRequestFlyout}
      />

      {showRequestFlyout && (
        <EuiFlyout onClose={() => setShowRequestFlyout(false)} maxWidth={640}>
          <EuiPageContent>
            <EuiTitle>
              <h3>
                {i18n.translate('xpack.painless_playground.flyoutTitle', {
                  defaultMessage: 'Test script request',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="json" paddingSize="s" isCopyable>
              {'POST _scripts/painless/_execute\n'}
              {formatJson(buildRequestPayload(code, context, contextSetup))}
            </EuiCodeBlock>
          </EuiPageContent>
        </EuiFlyout>
      )}
    </>
  );
}
