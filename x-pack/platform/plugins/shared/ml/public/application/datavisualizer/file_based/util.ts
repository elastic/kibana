/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileUploadStartDependencies } from '@kbn/file-upload/src/file_upload_component/kibana_context';
import type { StartServices } from '../../contexts/kibana';

// ML spreads coreStart into its StartServices so we need to reconstruct coreStart here
// to satisfy the FileUploadStartDependencies type
export function buildDependencies(services: StartServices): FileUploadStartDependencies {
  return {
    analytics: services.analytics,
    application: services.application,
    data: services.data,
    fieldFormats: services.fieldFormats,
    fileUpload: services.fileUpload,
    http: services.http,
    notifications: services.notifications,
    share: services.share,
    uiActions: services.uiActions,
    uiSettings: services.uiSettings,
    coreStart: {
      analytics: services.analytics,
      application: services.application,
      chrome: services.chrome,
      customBranding: services.customBranding,
      docLinks: services.docLinks,
      executionContext: services.executionContext,
      featureFlags: services.featureFlags,
      http: services.http,
      injection: services.injection,
      i18n: services.i18n,
      notifications: services.notifications,
      overlays: services.overlays,
      uiSettings: services.uiSettings,
      settings: services.settings,
      fatalErrors: services.fatalErrors,
      deprecations: services.deprecations,
      theme: services.theme,
      plugins: services.plugins,
      pricing: services.pricing,
      security: services.security,
      userProfile: services.userProfile,
      rendering: services.rendering,
    },
  };
}
