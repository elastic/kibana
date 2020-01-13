/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiForm,
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiFormRow,
  EuiPanel,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  service: any;
}

interface State {
  code: string;
  output: any;
}
export class PainlessPlayground extends React.Component<Props, State> {
  state = {
    code: '',
    output: '',
  };

  onPatternChange = (code: string) => {
    this.setState({ code });
  };

  submit = async () => {
    try {
      const payload = {
        script: {
          source: this.state.code,
        },
      };
      const response = await this.props.service.simulate(payload);
      this.setState({
        output: response,
      });
    } catch (e) {
      this.setState({
        output: e,
      });
    }
  };

  onSimulateClick = () => {
    this.submit();
  };

  isSimulateDisabled = () => {
    return this.state.code.trim() === '';
  };

  render() {
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
                  <EuiPanel paddingSize="s">
                    <CodeEditor
                      languageId="javascript"
                      height={250}
                      value={this.state.code}
                      onChange={this.onPatternChange}
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
                  </EuiPanel>
                </EuiFormRow>
                <EuiSpacer />
                <EuiButton
                  fill
                  onClick={this.onSimulateClick}
                  isDisabled={this.isSimulateDisabled()}
                  data-test-subj="btnSimulate"
                >
                  <FormattedMessage
                    id="xpack.painlessPlayground.simulateButtonLabel"
                    defaultMessage="Simulate"
                  />
                </EuiButton>
                <EuiSpacer />
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.painlessPlayground.outputLabel"
                      defaultMessage="Output"
                    />
                  }
                  fullWidth
                  data-test-subj="output"
                >
                  <EuiPanel paddingSize="s">
                    <CodeEditor
                      languageId="json"
                      height={250}
                      value={JSON.stringify(this.state.output, null, 2)}
                      options={{
                        fontSize: 12,
                        minimap: {
                          enabled: false,
                        },
                      }}
                    />
                  </EuiPanel>
                </EuiFormRow>
              </EuiForm>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
