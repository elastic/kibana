/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { StartServices } from '../hooks/use_kibana';

const noOp = () => {};
const noOpAsync = () => Promise.resolve([] as never[]);

// Solid-background placeholder so mocked image thumbnails render a visible picture in Storybook
// (the real files blob endpoint isn't served by the Storybook dev server).
const PLACEHOLDER_IMAGE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">' +
  '<rect width="120" height="80" fill="#4a7bd6"/>' +
  '<circle cx="30" cy="26" r="10" fill="#ffd666"/>' +
  '<path d="M0 80 L40 40 L70 68 L95 46 L120 80 Z" fill="#2f5aa8"/></svg>';
const PLACEHOLDER_IMAGE_DATA_URI = `data:image/svg+xml,${encodeURIComponent(
  PLACEHOLDER_IMAGE_SVG
)}`;
const isFilesBlobPath = (path: string) => path.includes('/api/files/');

const INFERENCE_CONNECTORS_PATH = '/internal/search_inference_endpoints/connectors';

const getUiSetting = (key: string) =>
  key === AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID ? true : undefined;

export const createStorybookKibanaServices = (): StartServices =>
  ({
    analytics: { reportEvent: noOp },
    notifications: {
      toasts: {
        add: noOp,
        addSuccess: noOp,
        addWarning: noOp,
        addDanger: noOp,
        addError: noOp,
        remove: noOp,
        get$: () => of([]),
      },
    },
    uiSettings: {
      get: () => undefined,
      get$: () => of(undefined),
      getAll: () => ({}),
      overrideLocalDefault: noOp,
      isCustom: () => false,
      isOverridden: () => false,
      isDeclared: () => false,
      isDefault: () => true,
      set: () => Promise.resolve(true),
      remove: () => Promise.resolve(true),
    },
    http: {
      get: (path: string) =>
        path === INFERENCE_CONNECTORS_PATH
          ? Promise.resolve({ connectors: [], soEntryFound: false })
          : noOpAsync(),
      post: noOpAsync,
      put: noOpAsync,
      delete: noOpAsync,
      patch: noOpAsync,
      fetch: noOpAsync,
      basePath: {
        get: () => '',
        prepend: (p: string) => (isFilesBlobPath(p) ? PLACEHOLDER_IMAGE_DATA_URI : p),
        remove: (p: string) => p,
      },
    },
    settings: {
      client: {
        get: getUiSetting,
        get$: (key: string) => of(getUiSetting(key)),
        set: () => Promise.resolve(true),
        getAll: () => ({}),
      },
    },
    application: {
      capabilities: { management: {}, catalogue: {}, actions: { show: true } },
      currentAppId$: of('agentBuilder'),
      currentLocation$: of({ id: 'agentBuilder', state: {} }),
      navigateToApp: () => Promise.resolve(),
      getUrlForApp: () => '/',
      navigateToUrl: () => Promise.resolve(),
    },
    appParams: { history: {} },
    plugins: {},
  } as unknown as StartServices);
