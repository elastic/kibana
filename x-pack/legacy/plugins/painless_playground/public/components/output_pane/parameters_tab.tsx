/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiIcon,
  EuiToolTip,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '../../../../../../../src/plugins/kibana_react/public';
import { painlessContextOptions } from '../../common/constants';

interface Props {
  context: string;
  contextSetup: Record<string, string>;
  setContext: (context: string) => void;
  setContextSetup: (contextSetup: Record<string, string>) => void;
  renderMainControls: () => React.ReactElement;
}

export function ParametersTab({ context, contextSetup, setContext, setContextSetup }: Props) {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <EuiToolTip
            content={i18n.translate('xpack.painless_playground.parametersFieldTooltipText', {
              defaultMessage: 'Your script can access these values by name',
            })}
          >
            <span>
              <FormattedMessage
                id="xpack.painless_playground.parametersFieldLabel"
                defaultMessage="Parameters"
              />{' '}
              <EuiIcon type="questionInCircle" color="subdued" />
            </span>
          </EuiToolTip>
        }
        fullWidth
        labelAppend={
          <EuiText size="xs">
            <EuiLink
              href="https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-scripting-using.html#prefer-params"
              target="_blank"
            >
              {i18n.translate('xpack.painless_playground.parametersFieldDocLinkText', {
                defaultMessage: 'Parameters docs',
              })}
            </EuiLink>
          </EuiText>
        }
        helpText={i18n.translate('xpack.painless_playground.helpIconAriaLabel', {
          defaultMessage: 'Use JSON format',
        })}
      >
        <EuiPanel paddingSize="s">
          <CodeEditor
            languageId="javascript"
            height={600}
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
              automaticLayout: true,
            }}
          />
        </EuiPanel>
      </EuiFormRow>
    </>
  );
}
