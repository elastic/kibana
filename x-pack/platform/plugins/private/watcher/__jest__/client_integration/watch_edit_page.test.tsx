/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import '@kbn/code-editor-mock/jest_helper';

import { getWatch } from '../../__fixtures__';
import { defaultWatch } from '../../public/application/models/watch';
import { WATCH, WATCH_ID } from './helpers/jest_constants';
import { API_BASE_PATH } from '../../common/constants';
import type { HttpSetup } from '@kbn/core/public';
import { WatchEditPage } from '../../public/application/sections/watch_edit_page/watch_edit_page';
import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';
import { registerRouter } from '../../public/application/lib/navigation';

const renderWatchEditPage = ({
  httpSetup,
  id,
  type,
}: {
  httpSetup: HttpSetup;
  id?: string;
  type?: string;
}) => {
  const Wrapped = WithAppDependencies(WatchEditPage, httpSetup);
  render(
    <I18nProvider>
      <Wrapped match={{ params: { id, type } }} />
    </I18nProvider>
  );
};

describe('<WatchEditPage />', () => {
  let httpSetup: HttpSetup;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let routerHistoryPush: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Advanced watch', () => {
    beforeEach(async () => {
      ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
      routerHistoryPush = jest.fn();
      registerRouter({ history: { push: routerHistoryPush } });

      httpRequestsMockHelpers.setLoadWatchResponse(WATCH_ID, WATCH);

      renderWatchEditPage({ httpSetup, id: WATCH_ID });
      await screen.findByTestId('jsonWatchForm');
    });

    describe('on component mount', () => {
      test('should set the correct page title', () => {
        expect(screen.getByTestId('pageTitle')).toHaveTextContent(`Edit ${WATCH.watch.name}`);
      });

      test('should populate the correct values', () => {
        const { watch } = WATCH;
        const jsonEditorValue = screen.getByTestId('jsonEditor').getAttribute('data-currentvalue');

        expect(screen.getByTestId('jsonWatchForm')).toBeInTheDocument();
        expect(screen.getByTestId('nameInput')).toHaveValue(watch.name);
        expect(screen.getByTestId('idInput')).toHaveValue(watch.id);
        expect(JSON.parse(jsonEditorValue!)).toEqual(defaultWatch);

        // ID should not be editable
        expect(screen.getByTestId('idInput')).toHaveAttribute('readonly');
      });

      test('save a watch with new values', async () => {
        const { watch } = WATCH;
        const user = userEvent.setup();

        const EDITED_WATCH_NAME = 'new_watch_name';

        fireEvent.change(screen.getByTestId('nameInput'), { target: { value: EDITED_WATCH_NAME } });

        await user.click(screen.getByTestId('saveWatchButton'));

        const DEFAULT_LOGGING_ACTION_ID = 'logging_1';
        const DEFAULT_LOGGING_ACTION_TYPE = 'logging';
        const DEFAULT_LOGGING_ACTION_TEXT =
          'There are {{ctx.payload.hits.total}} documents in your index. Threshold is 10.';

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/${watch.id}`,
            expect.objectContaining({
              body: JSON.stringify({
                id: watch.id,
                name: EDITED_WATCH_NAME,
                type: watch.type,
                isNew: false,
                isActive: true,
                actions: [
                  {
                    id: DEFAULT_LOGGING_ACTION_ID,
                    type: DEFAULT_LOGGING_ACTION_TYPE,
                    text: DEFAULT_LOGGING_ACTION_TEXT,
                    [DEFAULT_LOGGING_ACTION_TYPE]: {
                      text: DEFAULT_LOGGING_ACTION_TEXT,
                    },
                  },
                ],
                watch: defaultWatch,
              }),
            })
          );
        });

        expect(routerHistoryPush).toHaveBeenCalledWith({ pathname: '/watches' });
      });
    });
  });

  describe('Threshold watch', () => {
    const watch = {
      ...getWatch({
        id: WATCH_ID,
        type: 'threshold',
        name: 'my_threshold_watch',
        timeField: '@timestamp',
        triggerIntervalSize: 10,
        triggerIntervalUnit: 'm',
        aggType: 'count',
        termSize: 10,
        thresholdComparator: '>',
        timeWindowSize: 10,
        timeWindowUnit: 'm',
        threshold: [1000],
      }),
      // ThresholdWatchEdit expects indices + fields to derive timeField options.
      index: ['index1'],
    };

    beforeEach(async () => {
      ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
      routerHistoryPush = jest.fn();
      registerRouter({ history: { push: routerHistoryPush } });

      httpRequestsMockHelpers.setLoadIndexPatternsResponse([]);
      httpRequestsMockHelpers.setLoadEsFieldsResponse({
        fields: [{ name: '@timestamp', type: 'date', normalizedType: 'date' }],
      });
      httpRequestsMockHelpers.setLoadWatchResponse(WATCH_ID, { watch });

      renderWatchEditPage({ httpSetup, id: WATCH_ID });
      await screen.findByTestId('thresholdWatchForm');
    });

    describe('on component mount', () => {
      test('should set the correct page title', () => {
        expect(screen.getByTestId('pageTitle')).toHaveTextContent(`Edit ${watch.name}`);
      });

      test('should populate the correct values', async () => {
        expect(screen.getByTestId('thresholdWatchForm')).toBeInTheDocument();
        expect(screen.getByTestId('nameInput')).toHaveValue(watch.name);
        await waitFor(() => {
          expect(screen.getByTestId('watchTimeFieldSelect')).toHaveValue(watch.timeField);
        });
      });

      test('should save the watch with new values', async () => {
        const user = userEvent.setup();

        const EDITED_WATCH_NAME = 'new_threshold_watch_name';

        fireEvent.change(screen.getByTestId('nameInput'), { target: { value: EDITED_WATCH_NAME } });

        await user.click(screen.getByTestId('saveWatchButton'));

        const {
          id,
          type,
          timeField,
          triggerIntervalSize,
          triggerIntervalUnit,
          aggType,
          termSize,
          thresholdComparator,
          timeWindowSize,
          timeWindowUnit,
          threshold,
        } = watch;

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/${watch.id}`,
            expect.objectContaining({
              body: JSON.stringify({
                id,
                name: EDITED_WATCH_NAME,
                type,
                isNew: false,
                isActive: true,
                actions: [],
                index: ['index1'],
                timeField,
                triggerIntervalSize,
                triggerIntervalUnit,
                aggType,
                termSize,
                termOrder: 'desc',
                thresholdComparator,
                timeWindowSize,
                timeWindowUnit,
                hasTermsAgg: false,
                threshold: threshold && threshold[0],
              }),
            })
          );
        });

        expect(routerHistoryPush).toHaveBeenCalledWith({ pathname: '/watches' });
      });
    });
  });
});
