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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  service: any;
}

interface State {
  code: string;
  request?: string;
  response?: string;
}
export function PainlessPlayground(props: Props) {
  const [state, setState] = useState<State>({
    code: '',
    request: '',
    response: '',
  });

  const submit = async () => {
    const request = {
      script: {
        source: state.code,
      },
    };
    try {
      const response = await props.service.simulate(request);
      setState({
        code: state.code,
        response: JSON.stringify(response, null, 2),
        request: JSON.stringify(request, null, 2),
      });
    } catch (e) {
      setState({
        code: state.code,
        response: JSON.stringify(e, null, 2),
        request: JSON.stringify(request, null, 2),
      });
    }
  };

  const onSimulateClick = () => {
    submit();
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
                    value={state.code}
                    onChange={code => setState({ code })}
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
                onClick={onSimulateClick}
                isDisabled={state.code.trim() === ''}
                data-test-subj="btnSimulate"
              >
                <FormattedMessage
                  id="xpack.painlessPlayground.simulateButtonLabel"
                  defaultMessage="Simulate"
                />
              </EuiButton>
              <EuiSpacer />

              {state.request && (
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.painlessPlayground.outputLabel"
                      defaultMessage="Request"
                    />
                  }
                  fullWidth
                  data-test-subj="request"
                >
                  <div style={{ border: '1px solid #D3DAE6', padding: '3px' }}>
                    <CodeEditor
                      languageId="json"
                      height={250}
                      value={'POST /_scripts/painless/_execute\n' + state.request}
                      options={{
                        fontSize: 12,
                        minimap: {
                          enabled: false,
                        },
                      }}
                    />
                  </div>
                </EuiFormRow>
              )}

              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.painlessPlayground.outputLabel"
                    defaultMessage="Response"
                  />
                }
                fullWidth
                data-test-subj="response"
              >
                <div style={{ border: '1px solid #D3DAE6', padding: '3px' }}>
                  <CodeEditor
                    languageId="json"
                    height={250}
                    value={state.response || ''}
                    options={{
                      fontSize: 12,
                      minimap: {
                        enabled: false,
                      },
                    }}
                  />
                </div>
              </EuiFormRow>
            </EuiForm>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
