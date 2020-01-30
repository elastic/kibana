/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiIconTip,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';
import { painlessContextOptions } from '../common/constants';

interface Props {
  context: string;
  contextSetup: Record<string, string>;
  setContext: (context: string) => void;
  setContextSetup: (contextSetup: Record<string, string>) => void;
  renderMainControls: () => React.ReactElement;
}

export function Settings({
  context,
  contextSetup,
  setContext,
  setContextSetup,
  renderMainControls,
}: Props) {
  return (
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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContext(e.target.value)}
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
                aria-label={i18n.translate('xpack.painless_playground.helpIconAriaLabel', {
                  defaultMessage: 'Help',
                })}
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
                height={150}
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
                  aria-label={i18n.translate('xpack.painless_playground.helpIconAriaLabel', {
                    defaultMessage: 'Help',
                  })}
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
                  setContextSetup(Object.assign({}, contextSetup, { index: e.target.value }))
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
                  aria-label={i18n.translate('xpack.painless_playground.helpIconAriaLabel', {
                    defaultMessage: 'Help',
                  })}
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
          )}
          <EuiSpacer size="m" />
          {renderMainControls()}
        </EuiForm>
      </EuiPanel>
    </>
  );
}
