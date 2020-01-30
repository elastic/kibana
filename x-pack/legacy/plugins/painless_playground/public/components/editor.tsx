/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiSpacer, EuiPageContent } from '@elastic/eui';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  code: string;
  setCode: (code: string) => void;
  renderMainControls: () => React.ReactElement;
}

export function Editor({ code, setCode, renderMainControls }: Props) {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiPageContent panelPaddingSize="m">
        <EuiPageContent panelPaddingSize="s">
          <CodeEditor
            languageId="painless"
            height={380}
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
  );
}
