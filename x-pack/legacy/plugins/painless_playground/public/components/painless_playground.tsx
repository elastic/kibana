/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
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
import { Settings } from './settings';
import { Editor } from './editor';

export function PainlessPlayground({
  executeCode,
}: {
  executeCode: (payload: Request) => Promise<Response>;
}) {
  const [code, setCode] = useState(
    getFromLocalStorage('painlessPlaygroundCode', 'return "Hello painless world!"')
  );
  const [response, setResponse] = useState<Response>({});
  const [context, setContext] = useState(
    getFromLocalStorage('painlessPlaygroundContext', 'painless_test_without_params')
  );
  const [contextSetup, setContextSetup] = useState(
    getFromLocalStorage('painlessPlaygroundContextSetup', {}, true)
  );

  const [showRequestFlyout, setShowRequestFlyout] = useState(false);

  const buildRequestPayloadPreview = () => buildRequestPayload(code, context, contextSetup);

  const submit = async () => {
    try {
      localStorage.setItem('painlessPlaygroundCode', code);
      localStorage.setItem('painlessPlaygroundContext', context);
      localStorage.setItem('painlessPlaygroundContextSetup', JSON.stringify(contextSetup));
      const res = await executeCode(buildRequestPayloadPreview());
      setResponse(res);
    } catch (e) {
      setResponse({
        error: {
          message: e.message,
        },
      });
    }
  };

  const toggleViewRequestFlyout = () => {
    setShowRequestFlyout(!showRequestFlyout);
  };

  const renderMainControls = () => (
    <MainControls
      submit={submit}
      disabled={code.trim() === ''}
      toggleFlyout={toggleViewRequestFlyout}
    />
  );

  return (
    <>
      <EuiFlexGroup
        className="consoleContainer"
        gutterSize="s"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('xpack.painless_playground.title', {
                defaultMessage: 'Painless Playground',
              })}
            </h1>
          </EuiTitle>

          <EuiTabbedContent
            size="s"
            tabs={[
              {
                id: 'input',
                name: 'Code',
                content: (
                  <Editor code={code} setCode={setCode} renderMainControls={renderMainControls} />
                ),
              },
              {
                id: 'settings',
                name: 'Settings',
                content: (
                  <Settings
                    context={context}
                    contextSetup={contextSetup}
                    setContext={setContext}
                    setContextSetup={setContextSetup}
                    renderMainControls={renderMainControls}
                  />
                ),
              },
            ]}
          />
        </EuiFlexItem>
        {response.error || typeof response.result !== 'undefined' ? (
          <EuiFlexItem>
            <Output response={response} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {showRequestFlyout && (
        <EuiFlyout onClose={() => setShowRequestFlyout(false)}>
          <EuiPageContent>
            <EuiTitle>
              <h3>
                {i18n.translate('xpack.painless_playground.flyoutTitle', {
                  defaultMessage: 'Console Request',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="json" paddingSize="s" isCopyable>
              {'POST _scripts/painless/_execute\n'}
              {formatJson(buildRequestPayloadPreview())}
            </EuiCodeBlock>
          </EuiPageContent>
        </EuiFlyout>
      )}
    </>
  );
}
