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
  EuiHorizontalRule,
  EuiPanel,
  EuiSelect,
  EuiTabbedContent,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';
import { buildRequestPayload, formatJson, getFromLocalStorage } from './helpers';
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

  const buildRequestPayloadPreview = () => buildRequestPayload(code, context, contextSetup);

  const submit = async () => {
    try {
      const res = await executeCode(buildRequestPayloadPreview());
      localStorage.setItem('painlessPlaygroundCode', code);
      localStorage.setItem('painlessPlaygroundContext', context);
      localStorage.setItem('painlessPlaygroundContextSetup', JSON.stringify(contextSetup));
      setResponse(res);
    } catch (e) {
      setResponse(e);
    }
  };

  const renderExecuteBtn = () => (
    <EuiButton fill onClick={submit} isDisabled={code.trim() === ''} data-test-subj="btnExecute">
      <FormattedMessage id="xpack.painlessPlayground.executeButtonLabel" defaultMessage="Execute" />
    </EuiButton>
  );

  return (
    <>
      <EuiFlexGroup
        className="consoleContainer"
        gutterSize="none"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('console.pageHeading', {
                defaultMessage: 'Painless Playground',
              })}
            </h1>
          </EuiTitle>
          <EuiTabbedContent
            size="s"
            tabs={[
              {
                id: 'output',
                name: 'Code',
                content: (
                  <EuiPanel>
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
                    <EuiHorizontalRule margin="xs" />
                    {renderExecuteBtn()}
                  </EuiPanel>
                ),
              },
              {
                id: 'request',
                name: 'Request',
                content: (
                  <EuiPanel>
                    <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                      {'POST _scripts/painless/_execute\n'}
                      {formatJson(buildRequestPayloadPreview())}
                    </EuiCodeBlock>
                    <EuiHorizontalRule margin="xs" />
                    {renderExecuteBtn()}
                  </EuiPanel>
                ),
              },
              {
                id: 'settings',
                name: 'Settings',
                content: (
                  <EuiPanel>
                    <EuiForm data-test-subj="painlessPlayground">
                      <EuiFormRow
                        label={
                          <FormattedMessage
                            id="xpack.painlessPlayground.codeLabel"
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
                            id="xpack.painlessPlayground.parametersLabel"
                            defaultMessage="Parameters"
                          />
                        }
                        fullWidth
                        labelAppend={
                          <EuiIconTip
                            aria-label={i18n.translate(
                              'xpack.painlessPlayground.helpIconAriaLabel',
                              {
                                defaultMessage: 'Help',
                              }
                            )}
                            content={
                              <FormattedMessage
                                id="xpack.painlessPlayground.parametersHelp"
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
                              id="xpack.painlessPlayground.indexLabel"
                              defaultMessage="Index"
                            />
                          }
                          fullWidth
                          labelAppend={
                            <EuiIconTip
                              aria-label={i18n.translate(
                                'xpack.painlessPlayground.helpIconAriaLabel',
                                {
                                  defaultMessage: 'Help',
                                }
                              )}
                              content={
                                <FormattedMessage
                                  id="xpack.painlessPlayground.indexHelp"
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
                              id="xpack.painlessPlayground.codeLabel"
                              defaultMessage="Document"
                            />
                          }
                          fullWidth
                          labelAppend={
                            <EuiIconTip
                              aria-label={i18n.translate(
                                'xpack.painlessPlayground.helpIconAriaLabel',
                                {
                                  defaultMessage: 'Help',
                                }
                              )}
                              content={
                                <FormattedMessage
                                  id="xpack.painlessPlayground.documentHelp"
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
                      {renderExecuteBtn()}
                    </EuiForm>
                  </EuiPanel>
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
                    <EuiPanel>
                      <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                        {response?.result ? response?.result : formatJson(response?.error)}
                      </EuiCodeBlock>
                    </EuiPanel>
                  ),
                },
                {
                  id: 'request',
                  name: 'Response',
                  content: (
                    <EuiPanel>
                      <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                        {formatJson(response)}
                      </EuiCodeBlock>
                    </EuiPanel>
                  ),
                },
              ]}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </>
  );
}
