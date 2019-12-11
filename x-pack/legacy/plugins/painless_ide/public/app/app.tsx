/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';

import {
  EuiPageBody,
  EuiPageContent,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiFormRow,
} from '@elastic/eui';

import { useLoadPainless } from './services/http';
import { documentationService } from './services/documentation';
import { breadcrumbService } from './services/navigation';
import { useCore } from './app_context';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public/code_editor';
import { LANGUAGE_ID } from '../../../canvas/public/lib/monaco_language_def';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
export const App = () => {
  const {
    i18n: { FormattedMessage },
  } = useCore();

  // Set breadcrumb
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('home');
  }, []);

  const { error, isLoading, data } = useLoadPainless();
  console.log('Loaded data', data);

  const renderPageHeader = () => (
    <>
      <EuiTitle size="l">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <h1 data-test-subj="appTitle">
              <FormattedMessage id="xpack.painlessIde.homeTitle" defaultMessage="Painless IDE" />
            </h1>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={documentationService.getPainlessDocUrl()}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              <FormattedMessage
                id="xpack.painlessIde.home.painlessDocLinkText"
                defaultMessage="Painless docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiTitle size="s">
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.painlessIde.homeDescription"
            defaultMessage="Practice Painless."
          />
        </EuiText>
      </EuiTitle>
    </>
  );

  const value = 'def foo = bar;';
  const isCompact = false;

  const kibana = useKibana();

  const uiSettings = kibana.services.uiSettings;
  if (!uiSettings) return null;

  return (
    <EuiPageBody>
      <EuiPageContent>{renderPageHeader()}</EuiPageContent>
      <div className="canvasExpressionInput">
        <EuiFormRow
          className="canvasExpressionInput__inner"
          fullWidth
          isInvalid={Boolean(error)}
          error={error}
        >
          <div className="canvasExpressionInput__editor">
            <CodeEditor
              languageId={LANGUAGE_ID}
              value={value}
              //onChange={this.forceUpdate()}
              suggestionProvider={{
                triggerCharacters: [' '],
                //provideCompletionItems: this.provideSuggestions,
              }}
              hoverProvider={{
                //provideHover: this.providerHover,
              }}
              options={{
                fontSize: isCompact ? 12 : 16,
                scrollBeyondLastLine: false,
                quickSuggestions: true,
                minimap: {
                  enabled: false,
                },
                wordBasedSuggestions: false,
                wordWrap: 'on',
                wrappingIndent: 'indent',
              }}
              //editorDidMount={this.editorDidMount}
            />
          </div>
        </EuiFormRow>
      </div>
    </EuiPageBody>
  );
};
