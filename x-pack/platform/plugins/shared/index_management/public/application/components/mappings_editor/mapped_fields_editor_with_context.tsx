/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { MappedFieldsEditorProps as SharedMappedFieldsEditorProps } from '@kbn/index-management-shared-types';

import { UIM_APP_NAME } from '../../../../common/constants/ui_metric';
import {
  createKibanaReactContext,
  GlobalFlyout,
  KibanaRenderContextProvider,
} from '../../../shared_imports';
import type { AppDependencies } from '../../app_context';
import { AppContextProvider } from '../../app_context';
import { documentationService } from '../../services/documentation';
import { httpService } from '../../services/http';
import { NotificationService } from '../../services/notification';
import { UiMetricService } from '../../services/ui_metric';
import { MappedFieldsEditor } from './mapped_fields_editor';
import { MappingsEditorProvider } from './mappings_editor_context';
import type { OnUpdateHandler } from './types';

const { GlobalFlyoutProvider } = GlobalFlyout;

export interface MappedFieldsEditorWithContextProps extends SharedMappedFieldsEditorProps {
  core: CoreStart;
  dependencies: AppDependencies;
}

const createAppDependencies = (
  core: CoreStart,
  dependencies: AppDependencies
): AppDependencies => {
  if (!httpService.httpClient) {
    httpService.setup(core.http);
  }
  documentationService.setup(core.docLinks);

  return {
    ...dependencies,
    services: {
      ...(dependencies.services || {}),
      httpService,
      notificationService: new NotificationService(core.notifications.toasts),
      uiMetricService: new UiMetricService(UIM_APP_NAME),
    },
  };
};

export const MappedFieldsEditorWithContext = React.memo(
  ({ core, dependencies, value, onChange }: MappedFieldsEditorWithContextProps) => {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const contextRef = useRef<{
      appDependencies: AppDependencies;
      KibanaReactContextProvider: ReturnType<
        typeof createKibanaReactContext<{
          application: CoreStart['application'];
          uiSettings: AppDependencies['uiSettings'];
          settings: AppDependencies['settings'];
          kibanaVersion: { get: () => AppDependencies['kibanaVersion'] };
          theme: CoreStart['theme'];
          userProfile: CoreStart['userProfile'];
        }>
      >['Provider'];
    }>();

    if (!contextRef.current) {
      const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
        application: core.application,
        uiSettings: dependencies.uiSettings,
        settings: dependencies.settings,
        kibanaVersion: {
          get: () => dependencies.kibanaVersion,
        },
        theme: core.theme,
        userProfile: core.userProfile,
      });

      contextRef.current = {
        appDependencies: createAppDependencies(core, dependencies),
        KibanaReactContextProvider,
      };
    }

    const { appDependencies, KibanaReactContextProvider } = contextRef.current;

    const handleChange = useCallback<OnUpdateHandler>((update) => {
      onChangeRef.current({
        getData: () => update.getData() as Record<string, unknown> | undefined,
        validate: update.validate,
        isValid: update.isValid,
      });
    }, []);

    return (
      <KibanaRenderContextProvider {...core}>
        <KibanaReactContextProvider>
          <AppContextProvider value={{ ...appDependencies, overlays: core.overlays }}>
            <MappingsEditorProvider>
              <GlobalFlyoutProvider>
                <MappedFieldsEditor
                  value={value}
                  onChange={handleChange}
                  docLinks={core.docLinks}
                />
              </GlobalFlyoutProvider>
            </MappingsEditorProvider>
          </AppContextProvider>
        </KibanaReactContextProvider>
      </KibanaRenderContextProvider>
    );
  }
);
