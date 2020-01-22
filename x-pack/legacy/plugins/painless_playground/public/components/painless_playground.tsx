/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiTabbedContent,
  EuiTitle,
  EuiIconTip,
  EuiSpacer,
  EuiPageContent,
  EuiFlyout,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';
import { buildRequestPayload, formatJson, getFromLocalStorage, formatResponse } from './helpers';
import { Request, Response } from './types';
import { painlessContextOptions } from './constants';

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
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          onClick={submit}
          isDisabled={code.trim() === ''}
          data-test-subj="btnExecute"
        >
          <FormattedMessage
            id="xpack.painless_playground.executeButtonLabel"
            defaultMessage="Execute"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          onClick={toggleViewRequestFlyout}
          isDisabled={code.trim() === ''}
          data-test-subj="btnViewRequest"
        >
          {i18n.translate('xpack.painless_playground.previewRequestButtonLabel', {
            defaultMessage: 'Preview Request',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
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
                  <>
                    <EuiSpacer size="s" />
                    <EuiPageContent panelPaddingSize="m">
                      <EuiPageContent panelPaddingSize="s">
                        <CodeEditor
                          languageId="painless"
                          height={250}
                          value={code}
                          onChange={setCode}
                          options={{
                            fontSize: 12,
                            minimap: {
                              enabled: false,
                            },
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            wrappingIndent: 'indent',
                          }}
                        />
                      </EuiPageContent>
                      <EuiSpacer size="m" />
                      {renderMainControls()}
                    </EuiPageContent>
                  </>
                ),
              },
              {
                id: 'settings',
                name: 'Settings',
                content: (
                  <>
                    <EuiSpacer size="s" />
                    <EuiPanel>
                      <EuiForm data-test-subj="painlessPlayground">
                        <EuiFormRow
                          label={
                            <FormattedMessage
                              id="xpack.painless_playground.execution_context"
                              defaultMessage="Execution Context"
                            />
                          }
                          fullWidth
                        >
                          <EuiSelect
                            options={painlessContextOptions}
                            value={context}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                              setContext(e.target.value)
                            }
                          />
                        </EuiFormRow>

                        <EuiFormRow
                          label={
                            <FormattedMessage
                              id="xpack.painless_playground.parametersLabel"
                              defaultMessage="Parameters"
                            />
                          }
                          fullWidth
                          labelAppend={
                            <EuiIconTip
                              aria-label={i18n.translate(
                                'xpack.painless_playground.helpIconAriaLabel',
                                {
                                  defaultMessage: 'Help',
                                }
                              )}
                              content={
                                <FormattedMessage
                                  id="xpack.painless_playground.parametersHelp"
                                  defaultMessage="Enter JSON that's available as 'params' in the code"
                                />
                              }
                            />
                          }
                        >
                          <div style={{ border: '1px solid #D3DAE6', padding: '3px' }}>
                            <CodeEditor
                              languageId="javascript"
                              height={100}
                              value={contextSetup.params}
                              onChange={(value: string) => setContextSetup({ params: value })}
                              options={{
                                fontSize: 12,
                                minimap: {
                                  enabled: false,
                                },
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                wrappingIndent: 'indent',
                              }}
                            />
                          </div>
                        </EuiFormRow>

                        {['filter', 'score'].indexOf(context) !== -1 && (
                          <EuiFormRow
                            label={
                              <FormattedMessage
                                id="xpack.painless_playground.indexLabel"
                                defaultMessage="Index"
                              />
                            }
                            fullWidth
                            labelAppend={
                              <EuiIconTip
                                aria-label={i18n.translate(
                                  'xpack.painless_playground.helpIconAriaLabel',
                                  {
                                    defaultMessage: 'Help',
                                  }
                                )}
                                content={
                                  <FormattedMessage
                                    id="xpack.painless_playground.indexHelp"
                                    defaultMessage="The name of an index containing a mapping that is compatible with the document being indexed."
                                  />
                                }
                              />
                            }
                          >
                            <EuiFieldText
                              fullWidth
                              value={contextSetup.index || ''}
                              onChange={e =>
                                setContextSetup(
                                  Object.assign({}, contextSetup, { index: e.target.value })
                                )
                              }
                            />
                          </EuiFormRow>
                        )}
                        {['filter', 'score'].indexOf(context) !== -1 && (
                          <EuiFormRow
                            label={
                              <FormattedMessage
                                id="xpack.painless_playground.codeLabel"
                                defaultMessage="Document"
                              />
                            }
                            fullWidth
                            labelAppend={
                              <EuiIconTip
                                aria-label={i18n.translate(
                                  'xpack.painless_playground.helpIconAriaLabel',
                                  {
                                    defaultMessage: 'Help',
                                  }
                                )}
                                content={
                                  <FormattedMessage
                                    id="xpack.painless_playground.documentHelp"
                                    defaultMessage="Enter document as JSON that's available as 'doc' in the code"
                                  />
                                }
                              />
                            }
                          >
                            <div style={{ border: '1px solid #D3DAE6', padding: '3px' }}>
                              <CodeEditor
                                languageId="javascript"
                                height={100}
                                value={contextSetup.document}
                                onChange={(value: string) =>
                                  setContextSetup(
                                    Object.assign({}, contextSetup, { document: value })
                                  )
                                }
                                options={{
                                  fontSize: 12,
                                  minimap: {
                                    enabled: false,
                                  },
                                  scrollBeyondLastLine: false,
                                  wordWrap: 'on',
                                  wrappingIndent: 'indent',
                                }}
                              />
                            </div>
                          </EuiFormRow>
                        )}
                        <EuiSpacer size="m" />
                        {renderMainControls()}
                      </EuiForm>
                    </EuiPanel>
                  </>
                ),
              },
            ]}
          />
        </EuiFlexItem>
        {response.error || response.result ? (
          <EuiFlexItem>
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
