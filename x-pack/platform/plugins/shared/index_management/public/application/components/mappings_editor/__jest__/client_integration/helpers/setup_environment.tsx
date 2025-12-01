/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, MemoExoticComponent } from 'react';
import React from 'react';
import SemVer from 'semver/classes/semver';

import { GlobalFlyout } from '@kbn/es-ui-shared-plugin/public';
import { docLinksServiceMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { MAJOR_VERSION } from '../../../../../../../common';
import { MappingsEditorProvider } from '../../../mappings_editor_context';
import { createKibanaReactContext } from '../../../shared_imports';
import { AppContextProvider, type AppDependencies } from '../../../../../app_context';
import type { Props as MappingsEditorProps } from '../../../mappings_editor';

export const kibanaVersion = new SemVer(MAJOR_VERSION);

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');

  const CodeEditorMock = ({
    value,
    onChange,
    'data-test-subj': testSubj,
  }: {
    value?: string;
    onChange?: (value: string | null) => void;
    'data-test-subj'?: string;
  }) => (
    <input
      data-test-subj={testSubj || 'mockCodeEditor'}
      data-currentvalue={value}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.currentTarget.getAttribute('data-currentvalue'));
      }}
    />
  );

  return {
    ...original,
    CodeEditor: CodeEditorMock,
  };
});

const { GlobalFlyoutProvider } = GlobalFlyout;

const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  kibanaVersion: {
    get: () => kibanaVersion,
  },
});

const defaultProps: MappingsEditorProps = {
  docLinks: docLinksServiceMock.createStartContract(),
  onChange: () => undefined,
  esNodesPlugins: [],
};

export const WithAppDependencies =
  (
    Comp: MemoExoticComponent<ComponentType<MappingsEditorProps>>,
    appDependencies?: Partial<AppDependencies>
  ) =>
  (props: Partial<MappingsEditorProps>) =>
    (
      <KibanaReactContextProvider>
        <AppContextProvider value={appDependencies as AppDependencies}>
          <MappingsEditorProvider>
            <GlobalFlyoutProvider>
              <Comp {...defaultProps} {...props} />
            </GlobalFlyoutProvider>
          </MappingsEditorProvider>
        </AppContextProvider>
      </KibanaReactContextProvider>
    );
