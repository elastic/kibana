/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeStart } from '@kbn/core/public';

interface PrepareNativeAppAttachmentNavigationParams {
  chrome: ChromeStart;
  closeOverlay?: () => void;
}

/**
 * Ensures the application workspace is visible and optional overlays are closed
 * before navigating to a native Kibana app via locator.
 */
export const prepareNativeAppAttachmentNavigation = ({
  chrome,
  closeOverlay,
}: PrepareNativeAppAttachmentNavigationParams): void => {
  chrome.applicationWorkspace.open();
  closeOverlay?.();
};
