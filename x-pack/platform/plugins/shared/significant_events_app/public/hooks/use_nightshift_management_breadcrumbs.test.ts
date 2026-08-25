/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  NIGHTSHIFT_APP_ID,
  OBSERVABILITY_OVERVIEW_APP_ID,
  SIGNIFICANT_EVENTS_APP_ID,
} from '@kbn/deeplinks-observability';
import { useNightshiftManagementBreadcrumbs } from './use_nightshift_management_breadcrumbs';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const setBreadcrumbs = jest.fn();
const docTitleChange = jest.fn();
const getUrlForApp = jest.fn((appId: string) => `/app/${appId}`);
const navigateToUrl = jest.fn();
const serverlessSetBreadcrumbs = jest.fn();

describe('useNightshiftManagementBreadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      core: {
        application: { getUrlForApp, navigateToUrl },
        chrome: { setBreadcrumbs, docTitle: { change: docTitleChange } },
      },
      dependencies: {
        start: { serverless: { setBreadcrumbs: serverlessSetBreadcrumbs } },
      },
      services: {},
    } as never);
  });

  it('nests Management under Observability and Nightshift', () => {
    renderHook(() => useNightshiftManagementBreadcrumbs());

    expect(setBreadcrumbs).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          text: 'Observability',
          href: `/app/${OBSERVABILITY_OVERVIEW_APP_ID}/overview`,
        }),
        expect.objectContaining({
          text: 'Nightshift',
          href: `/app/${NIGHTSHIFT_APP_ID}`,
          deepLinkId: NIGHTSHIFT_APP_ID,
        }),
        expect.objectContaining({
          text: 'Management',
          deepLinkId: SIGNIFICANT_EVENTS_APP_ID,
        }),
      ],
      {
        project: {
          absolute: false,
          value: [
            expect.objectContaining({
              text: 'Nightshift',
              deepLinkId: NIGHTSHIFT_APP_ID,
            }),
            expect.objectContaining({
              text: 'Management',
              deepLinkId: SIGNIFICANT_EVENTS_APP_ID,
            }),
          ],
        },
      }
    );
    expect(docTitleChange).toHaveBeenCalledWith(['Management', 'Nightshift', 'Observability']);
    expect(serverlessSetBreadcrumbs).toHaveBeenCalledWith(
      [
        expect.objectContaining({ text: 'Nightshift', deepLinkId: NIGHTSHIFT_APP_ID }),
        expect.objectContaining({ text: 'Management', deepLinkId: SIGNIFICANT_EVENTS_APP_ID }),
      ],
      { absolute: false }
    );
  });
});
