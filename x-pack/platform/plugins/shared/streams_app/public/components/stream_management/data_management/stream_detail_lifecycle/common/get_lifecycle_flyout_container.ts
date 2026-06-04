/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';

/**
 * Push flyouts must portal into the application scroll container so Kibana's layout
 * applies push padding and keeps chrome headers visible (see GridLayoutGlobalStyles).
 */
export const getLifecycleFlyoutContainer = (): HTMLElement | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }

  return document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID) ?? undefined;
};
