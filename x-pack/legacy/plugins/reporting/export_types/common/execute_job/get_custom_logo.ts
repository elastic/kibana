/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UI_SETTINGS_CUSTOM_PDF_LOGO } from '../../../common/constants';
import { ReportingCore } from '../../../server';
import { ConditionalHeaders, ServerFacade } from '../../../types';
import { JobDocPayloadPDF } from '../../printable_pdf/types'; // Logo is PDF only

export const getCustomLogo = async ({
  reporting,
  server,
  job,
  conditionalHeaders,
}: {
  reporting: ReportingCore;
  server: ServerFacade;
  job: JobDocPayloadPDF;
  conditionalHeaders: ConditionalHeaders;
}) => {
  const serverBasePath: string = server.config().get('server.basePath');

  const fakeRequest: any = {
    headers: conditionalHeaders.headers,
    // This is used by the spaces SavedObjectClientWrapper to determine the existing space.
    // We use the basePath from the saved job, which we'll have post spaces being implemented;
    // or we use the server base path, which uses the default space
    getBasePath: () => job.basePath || serverBasePath,
    path: '/',
    route: { settings: {} },
    url: { href: '/' },
    raw: { req: { url: '/' } },
  };

  const savedObjectsClient = await reporting.getSavedObjectsClient(fakeRequest);
  const uiSettings = await reporting.getUiSettingsServiceFactory(savedObjectsClient);
  const logo: string = await uiSettings.get(UI_SETTINGS_CUSTOM_PDF_LOGO);
  return { conditionalHeaders, logo };
};
