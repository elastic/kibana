/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
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
function getRequest(code: string) {
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

export function PainlessPlayground({ executeCode }: Props) {
  const [code, setCode] = useState('');
  const [response, setResponse] = useState<Response>({});

  const submit = async () => {
    try {
      const res = await executeCode(getRequest(code));
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
                    defaultMessage="Painless Code"
                  />
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
                        {'POST _scripts/painless/_execute\n' + formatJson(getRequest(code))}
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
