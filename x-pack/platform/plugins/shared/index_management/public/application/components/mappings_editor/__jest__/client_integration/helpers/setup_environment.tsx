/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
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

jest.mock('@kbn/code-editor');

const { GlobalFlyoutProvider } = GlobalFlyout;

const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  kibanaVersion: {
    get: () => kibanaVersion,
  },
});

const mappingsEditorDefaultProps: MappingsEditorProps = {
  docLinks: docLinksServiceMock.createStartContract(),
  onChange: () => undefined,
  esNodesPlugins: [],
};

export const WithAppDependencies =
  <P extends object>(
    Comp: ComponentType<P>,
    appDependencies?: unknown,
    defaultProps?: Partial<P>
  ) =>
  (props: Partial<P>) => {
    const resolvedDefaultProps =
      defaultProps ?? (mappingsEditorDefaultProps as unknown as Partial<P>);

    return (
      <KibanaReactContextProvider>
        <AppContextProvider value={appDependencies as AppDependencies}>
          <MappingsEditorProvider>
            <GlobalFlyoutProvider>
              <Comp {...(resolvedDefaultProps as P)} {...(props as P)} />
            </GlobalFlyoutProvider>
          </MappingsEditorProvider>
        </AppContextProvider>
      </KibanaReactContextProvider>
    );
  };
