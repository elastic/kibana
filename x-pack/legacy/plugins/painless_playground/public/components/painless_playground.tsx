/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiSelect,
  EuiForm,
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiFormRow,
  EuiTabbedContent,
  EuiCodeBlock,
  EuiFieldText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  executeCode: (payload: Record<string, unknown>) => Promise<any>;
}
interface Response {
  error?: { [key: string]: any };
  result?: string;
}

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}
function getRequest(code: string, context: string, contextSetup: string) {
  const params = parseJSON(contextSetup?.params);
  if (context === 'painless_test' && contextSetup.params) {
    return {
      script: {
        source: code,
        params,
      },
    };
  } else if (context === 'filter' || context === 'score') {
    return {
      script: {
        source: code,
        params,
      },
      context,
      context_setup: {
        index: contextSetup.index,
        document: parseJSON(contextSetup.doc),
      },
    };
  }

  return {
    script: {
      source: code,
    },
  };
}

function formatJson(text) {
  try {
    return JSON.stringify(text, null, 2);
  } catch (e) {
    return `Invalid JSON ${String(text)}`;
  }
}

function getFromLocalStorage(key: key, defaultValue: any = '', parse = false) {
  const value = localStorage.getItem(key);
  if (value && parse) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return defaultValue;
    }
  } else if (value) {
    return value;
  } else {
    return defaultValue;
  }
}

const painlessContextOptions = [
  { value: 'painless_test', text: 'Default - Execute as it is' },
  { value: 'filter', text: 'Filter - Execute like inside a script query' },
  { value: 'score', text: 'Score - Execute like inside a script query' },
];

export function PainlessPlayground({ executeCode }: Props) {
  const [code, setCode] = useState(getFromLocalStorage('painlessPlaygroundCode', ''));
  const [response, setResponse] = useState<Response>({});
  const [context, setContext] = useState(
    getFromLocalStorage('painlessPlaygroundContext', 'painless_test')
  );
  const [contextSetup, setContextSetup] = useState(
    getFromLocalStorage('painlessPlaygroundContextSetup', {}, true)
  );

  const submit = async () => {
    try {
      const res = await executeCode(getRequest(code, context, contextSetup));
      localStorage.setItem('painlessPlaygroundCode', code);
      localStorage.setItem('painlessPlaygroundContext', context);
      localStorage.setItem('painlessPlaygroundContextSetup', JSON.stringify(contextSetup));
      setResponse(res);
    } catch (e) {
      setResponse(e);
    }
  };

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentBody>
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContext(e.target.value)}
                />
              </EuiFormRow>
              <EuiFormRow
                label={
                  <FormattedMessage id="xpack.painlessPlayground.codeLabel" defaultMessage="Code" />
                }
                fullWidth
                data-test-subj="codeInput"
              >
                <div style={{ border: '1px solid #D3DAE6', padding: '3px' }}>
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
                </div>
              </EuiFormRow>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.painlessPlayground.codeLabel"
                    defaultMessage="Parameters (Enter JSON that's available as 'params' in the code)"
                  />
                }
                fullWidth
              >
                <div style={{ border: '1px solid #D3DAE6', padding: '3px' }}>
                  <CodeEditor
                    languageId="json"
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
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.painlessPlayground.indexLabel"
                    defaultMessage="Index (The name of an index containing a mapping that is compatible with the document being indexed.)"
                  />
                }
                fullWidth
              >
                <EuiFieldText
                  value={contextSetup.index || ''}
                  onChange={e =>
                    setContextSetup(Object.assign({}, contextSetup, { index: e.target.value }))
                  }
                />
              </EuiFormRow>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.painlessPlayground.codeLabel"
                    defaultMessage="Document (Enter document as JSON that's available as 'doc' in the code)"
                  />
                }
                fullWidth
              >
                <div style={{ border: '1px solid #D3DAE6', padding: '3px' }}>
                  <CodeEditor
                    languageId="json"
                    height={100}
                    value={contextSetup.document}
                    onChange={(value: string) =>
                      setContextSetup(Object.assign({}, contextSetup, { document: value }))
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
              <EuiSpacer />
              <EuiButton
                fill
                onClick={submit}
                isDisabled={code.trim() === ''}
                data-test-subj="btnSimulate"
              >
                <FormattedMessage
                  id="xpack.painlessPlayground.simulateButtonLabel"
                  defaultMessage="Simulate"
                />
              </EuiButton>
              <EuiSpacer />
            </EuiForm>
            {response.error || response.result ? (
              <EuiTabbedContent
                tabs={[
                  {
                    id: 'output',
                    name: 'Output',
                    content: (
                      <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                        {response?.result ? response?.result : formatJson(response?.error)}
                      </EuiCodeBlock>
                    ),
                  },
                  {
                    id: 'response',
                    name: 'Request',
                    content: (
                      <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                        {'POST _scripts/painless/_execute\n' +
                          formatJson(getRequest(code, context, contextSetup))}
                      </EuiCodeBlock>
                    ),
                  },
                  {
                    id: 'request',
                    name: 'Response',
                    content: (
                      <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                        {formatJson(response)}
                      </EuiCodeBlock>
                    ),
                  },
                ]}
              />
            ) : null}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
