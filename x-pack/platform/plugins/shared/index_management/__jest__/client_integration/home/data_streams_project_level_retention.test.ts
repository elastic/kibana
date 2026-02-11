/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import { within } from '@testing-library/react';
import { notificationServiceMock } from '@kbn/core/public/mocks';

import { breadcrumbService } from '../../../public/application/services/breadcrumbs';
import { MAX_DATA_RETENTION } from '../../../common/constants';
import { setupEnvironment } from '../helpers/setup_environment';
import { renderHome } from '../helpers/render_home';
import { notificationService } from '../../../public/application/services/notification';

import {
  createDataStreamTabActions,
  createDataStreamPayload,
} from '../helpers/actions/data_stream_actions';

const urlServiceMock = {
  locators: {
    get: () => ({
      getLocation: async () => ({
        app: '',
        path: '',
        state: {},
      }),
      getUrl: async ({ policyName }: { policyName: string }) => `/test/${policyName}`,
      getRedirectUrl: () => '/app/path',
      navigate: async () => {},
      useUrl: () => '',
    }),
  },
};
jest.mock('react-use/lib/useObservable', () => () => jest.fn());

describe('Data Streams - Project level max retention', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  const notificationsServiceMock = notificationServiceMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
    const env = setupEnvironment();
    httpSetup = env.httpSetup;
    httpRequestsMockHelpers = env.httpRequestsMockHelpers;
  });

  it('Should show error when retention value is bigger than project level retention', async () => {
    const ds1 = createDataStreamPayload({
      name: 'dataStream1',
      lifecycle: {
        enabled: true,
        data_retention: '25d',
        effective_retention: '25d',
        retention_determined_by: MAX_DATA_RETENTION,
        globalMaxRetention: '20d',
      },
    });

    httpRequestsMockHelpers.setLoadIndicesResponse([]);
    httpRequestsMockHelpers.setLoadDataStreamsResponse([ds1]);
    httpRequestsMockHelpers.setLoadDataStreamResponse(ds1.name, ds1);
    httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

    notificationService.setup(notificationsServiceMock);

    await renderHome(httpSetup, {
      initialEntries: ['/data_streams'],
      appServicesContext: {
        url: urlServiceMock,
        config: {
          enableProjectLevelRetentionChecks: true,
        },
      },
    });

    await screen.findByTestId('dataStreamTable');
    const actions = createDataStreamTabActions();

    await actions.clickNameAt(0);
    await screen.findByTestId('dataStreamDetailPanel');

    actions.clickEditDataRetentionButton();

    await screen.findByTestId('dataRetentionValue');

    const form = screen.getByTestId('editDataRetentionModal');
    // Assert the specific validation message (do not rely on non-unique attributes like `aria-live`).
    expect(
      within(form).getByText(/Maximum data retention period on this project is 20 days\./)
    ).toBeInTheDocument();
  });
});
