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
import { OutputPane } from './output_pane';
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
boolean isInCircle(def posX, def posY, def circleX, def circleY, def radius) {
  double distanceFromCircleCenter = Math.sqrt(Math.pow(circleX - posX, 2) + Math.pow(circleY - posY, 2));
  return distanceFromCircleCenter <= radius;
}

boolean isOnCircle(def posX, def posY, def circleX, def circleY, def radius, def thickness) {
  double distanceFromCircleCenter = Math.sqrt(Math.pow(circleX - posX, 2) + Math.pow(circleY - posY, 2));
  return (
    distanceFromCircleCenter >= radius - thickness
    && distanceFromCircleCenter <= radius + thickness
  );
}

def result = '';
int charCount = 0;

int width = 31;
int height = 25;

int eyePositionX = 8;
int eyePositionY = 6;
int eyeSize = 3;
int mouthSize = 11;
int mouthPositionX = width / 2;
int mouthPositionY = 9;

for (int y = 0; y < height; y++) {
  for (int x = 0; x < width; x++) {
    boolean isLeftEye = isInCircle(x, y, eyePositionX, eyePositionY, eyeSize);
    boolean isRightEye = isInCircle(x, y, width - eyePositionX - 1, eyePositionY, eyeSize);
    boolean isMouth = isOnCircle(x, y, mouthPositionX, mouthPositionY, mouthSize, 1) && y > mouthPositionY + 3;

    if (isLeftEye || isRightEye || isMouth) {
      result += "*";
    } else {
      result += ".";
    }

    result += " ";

    // Make sure the smiley face doesn't deform as the container changes width.
    charCount++;
    if (charCount % width === 0) {
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
  const [isRequestFlyoutOpen, setRequestFlyoutOpen] = useState(false);
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

  const toggleRequestFlyout = () => {
    setRequestFlyoutOpen(!isRequestFlyoutOpen);
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
          <OutputPane
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
        toggleRequestFlyout={toggleRequestFlyout}
        isRequestFlyoutOpen={isRequestFlyoutOpen}
        reset={() => setCode(exampleScript)}
      />

      {isRequestFlyoutOpen && (
        <RequestFlyout
          onClose={() => setRequestFlyoutOpen(false)}
          requestBody={formatJson(buildRequestPayload(code, context, contextSetup))}
          response={formatJson(response.success || response.error)}
        />
      )}
    </>
  );
}
