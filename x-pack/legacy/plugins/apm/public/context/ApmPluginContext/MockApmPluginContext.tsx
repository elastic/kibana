/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ApmPluginContext, ApmPluginContextValue } from '.';
import { createCallApmApi } from '../../services/rest/createCallApmApi';
import { ConfigSchema } from '../../new-platform/plugin';

const mockCore = {
  chrome: {
    setBreadcrumbs: () => {}
  },
  http: {
    basePath: {
      prepend: (path: string) => `/basepath${path}`
    }
  },
  notifications: {
    toasts: {
      addWarning: () => {},
      addDanger: () => {}
    }
  }
};

const mockConfig: ConfigSchema = {
  indexPatternTitle: 'apm-*',
  serviceMapEnabled: true,
  ui: {
    enabled: false
  }
};

export const mockApmPluginContextValue = {
  config: mockConfig,
  core: mockCore,
  packageInfo: { version: '0' },
  plugins: {}
};

export function MockApmPluginContextWrapper({
  children,
  value = {} as ApmPluginContextValue
}: {
  children?: React.ReactNode;
  value?: ApmPluginContextValue;
}) {
  if (value.core?.http) {
    createCallApmApi(value.core?.http);
  }
  return (
    <ApmPluginContext.Provider
      value={{
        ...mockApmPluginContextValue,
        ...value
      }}
    >
      {children}
    </ApmPluginContext.Provider>
  );
}
