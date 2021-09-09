/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Ecs, KibanaExecutionContext } from 'kibana/server';

import Fs from 'fs/promises';
import Path from 'path';
import { isEqual } from 'lodash';
import type { FtrProviderContext } from '../ftr_provider_context';

const logFilePath = Path.resolve(__dirname, '../kibana.log');

// to avoid splitting log record containing \n symbol
const endOfLine = /(?<=})\s*\n/;
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home']);
  const retry = getService('retry');

  async function assertLogContains(
    description: string,
    predicate: (record: Ecs) => boolean
  ): Promise<void> {
    // logs are written to disk asynchronously. I sacrificed performance to reduce flakiness.
    await retry.waitFor(description, async () => {
      const logsStr = await Fs.readFile(logFilePath, 'utf-8');
      const normalizedRecords = logsStr
        .split(endOfLine)
        .filter(Boolean)
        .map((s) => JSON.parse(s));

      return normalizedRecords.some(predicate);
    });
  }

  function isExecutionContextLog(
    record: string | undefined,
    executionContext: KibanaExecutionContext
  ) {
    if (!record) return false;
    try {
      const object = JSON.parse(record);
      return isEqual(object, executionContext);
    } catch (e) {
      return false;
    }
  }

  describe('Execution context service', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('flights');
    });

    describe('discover app', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('propagates context for Discover', async () => {
        await assertLogContains(
          'execution context propagates to Elasticsearch via "x-opaque-id" header',
          (record) => Boolean(record.http?.request?.id?.includes('kibana:application:discover'))
        );

        await assertLogContains('execution context propagates to Kibana logs', (record) =>
          isExecutionContextLog(record?.message, {
            description: 'fetch documents',
            id: '',
            name: 'discover',
            type: 'application',
            // discovery doesn't have an URL since one of from the example dataset is not saved separately
            url: '/app/discover',
          })
        );

        await assertLogContains('execution context propagates to Kibana logs', (record) =>
          isExecutionContextLog(record?.message, {
            description: 'fetch chart data and total hits',
            id: '',
            name: 'discover',
            type: 'application',
            url: '/app/discover',
          })
        );
      });
    });

    describe('dashboard app', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('[Flights] Global Flight Dashboard');
        await PageObjects.dashboard.waitForRenderComplete();
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      describe('propagates context for Lens visualizations', () => {
        it('lnsXY', async () => {
          await assertLogContains(
            'execution context propagates to Elasticsearch via "x-opaque-id" header',
            (record) =>
              Boolean(
                record.http?.request?.id?.includes(
                  'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsXY:086ac2e9-dd16-4b45-92b8-1e43ff7e3f65'
                )
              )
          );

          await assertLogContains('execution context propagates to Kibana logs', (record) =>
            isExecutionContextLog(record?.message, {
              parent: {
                type: 'application',
                name: 'dashboard',
                id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
                description: '[Flights] Global Flight Dashboard',
                url: '/view/7adfa750-4c81-11e8-b3d7-01146121b73d',
              },
              type: 'lens',
              name: 'lnsXY',
              id: '086ac2e9-dd16-4b45-92b8-1e43ff7e3f65',
              description: '[Flights] Flight count',
              url: '/app/lens#/edit_by_value',
            })
          );
        });

        it('lnsMetric', async () => {
          await assertLogContains(
            'execution context propagates to Elasticsearch via "x-opaque-id" header',
            (record) =>
              Boolean(
                record.http?.request?.id?.includes(
                  'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsMetric:b766e3b8-4544-46ed-99e6-9ecc4847e2a2'
                )
              )
          );

          await assertLogContains('execution context propagates to Kibana logs', (record) =>
            isExecutionContextLog(record?.message, {
              parent: {
                type: 'application',
                name: 'dashboard',
                id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
                description: '[Flights] Global Flight Dashboard',
                url: '/view/7adfa750-4c81-11e8-b3d7-01146121b73d',
              },
              type: 'lens',
              name: 'lnsMetric',
              id: '2e33ade5-96e5-40b4-b460-493e5d4fa834',
              description: '',
              url: '/app/lens#/edit_by_value',
            })
          );
        });

        it('lnsDatatable', async () => {
          await assertLogContains(
            'execution context propagates to Elasticsearch via "x-opaque-id" header',
            (record) =>
              Boolean(
                record.http?.request?.id?.includes(
                  'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsDatatable:fb86b32f-fb7a-45cf-9511-f366fef51bbd'
                )
              )
          );

          await assertLogContains('execution context propagates to Kibana logs', (record) =>
            isExecutionContextLog(record?.message, {
              parent: {
                type: 'application',
                name: 'dashboard',
                id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
                description: '[Flights] Global Flight Dashboard',
                url: '/view/7adfa750-4c81-11e8-b3d7-01146121b73d',
              },
              type: 'lens',
              name: 'lnsDatatable',
              id: 'fb86b32f-fb7a-45cf-9511-f366fef51bbd',
              description: 'Cities by delay, cancellation',
              url: '/app/lens#/edit_by_value',
            })
          );
        });

        it('lnsPie', async () => {
          await assertLogContains(
            'execution context propagates to Elasticsearch via "x-opaque-id" header',
            (record) =>
              Boolean(
                record.http?.request?.id?.includes(
                  'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsPie:5d53db36-2d5a-4adc-af7b-cec4c1a294e0'
                )
              )
          );
          await assertLogContains('execution context propagates to Kibana logs', (record) =>
            isExecutionContextLog(record?.message, {
              parent: {
                type: 'application',
                name: 'dashboard',
                id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
                description: '[Flights] Global Flight Dashboard',
                url: '/view/7adfa750-4c81-11e8-b3d7-01146121b73d',
              },
              type: 'lens',
              name: 'lnsPie',
              id: '5d53db36-2d5a-4adc-af7b-cec4c1a294e0',
              description: '[Flights] Delay Type',
              url: '/app/lens#/edit_by_value',
            })
          );
        });
      });

      it('propagates context for built-in Discover', async () => {
        await assertLogContains(
          'execution context propagates to Elasticsearch via "x-opaque-id" header',
          (record) =>
            Boolean(
              record.http?.request?.id?.includes(
                'application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;search:discover:571aaf70-4c88-11e8-b3d7-01146121b73d'
              )
            )
        );
        await assertLogContains('execution context propagates to Kibana logs', (record) =>
          isExecutionContextLog(record?.message, {
            parent: {
              type: 'application',
              name: 'dashboard',
              id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
              description: '[Flights] Global Flight Dashboard',
              url: '/view/7adfa750-4c81-11e8-b3d7-01146121b73d',
            },
            type: 'search',
            name: 'discover',
            id: '571aaf70-4c88-11e8-b3d7-01146121b73d',
            description: '[Flights] Flight Log',
            url: '/app/discover#/view/571aaf70-4c88-11e8-b3d7-01146121b73d',
          })
        );
      });

      it('propagates context for TSVB visualizations', async () => {
        await assertLogContains(
          'execution context propagates to Elasticsearch via "x-opaque-id" header',
          (record) =>
            Boolean(
              record.http?.request?.id?.includes(
                'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;visualization:TSVB:bcb63b50-4c89-11e8-b3d7-01146121b73d'
              )
            )
        );

        await assertLogContains('execution context propagates to Kibana logs', (record) =>
          isExecutionContextLog(record?.message, {
            parent: {
              type: 'application',
              name: 'dashboard',
              id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
              description: '[Flights] Global Flight Dashboard',
              url: '/view/7adfa750-4c81-11e8-b3d7-01146121b73d',
            },
            type: 'visualization',
            name: 'TSVB',
            id: 'bcb63b50-4c89-11e8-b3d7-01146121b73d',
            description: '[Flights] Delays & Cancellations',
            url: '/app/visualize#/edit/bcb63b50-4c89-11e8-b3d7-01146121b73d',
          })
        );
      });

      it('propagates context for Vega visualizations', async () => {
        await assertLogContains(
          'execution context propagates to Elasticsearch via "x-opaque-id" header',
          (record) =>
            Boolean(
              record.http?.request?.id?.includes(
                'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;visualization:Vega:ed78a660-53a0-11e8-acbd-0be0ad9d822b'
              )
            )
        );

        await assertLogContains('execution context propagates to Kibana logs', (record) =>
          isExecutionContextLog(record?.message, {
            parent: {
              type: 'application',
              name: 'dashboard',
              id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
              description: '[Flights] Global Flight Dashboard',
              url: '/view/7adfa750-4c81-11e8-b3d7-01146121b73d',
            },
            type: 'visualization',
            name: 'Vega',
            id: 'ed78a660-53a0-11e8-acbd-0be0ad9d822b',
            description: '[Flights] Airport Connections (Hover Over Airport)',
            url: '/app/visualize#/edit/ed78a660-53a0-11e8-acbd-0be0ad9d822b',
          })
        );
      });

      it('propagates context for Tag Cloud visualization', async () => {
        await assertLogContains(
          'execution context propagates to Elasticsearch via "x-opaque-id" header',
          (record) =>
            Boolean(
              record.http?.request?.id?.includes(
                'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;visualization:Tag cloud:293b5a30-4c8f-11e8-b3d7-01146121b73d'
              )
            )
        );

        await assertLogContains('execution context propagates to Kibana logs', (record) =>
          isExecutionContextLog(record?.message, {
            parent: {
              type: 'application',
              name: 'dashboard',
              id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
              description: '[Flights] Global Flight Dashboard',
              url: '/view/7adfa750-4c81-11e8-b3d7-01146121b73d',
            },
            type: 'visualization',
            name: 'Tag cloud',
            id: '293b5a30-4c8f-11e8-b3d7-01146121b73d',
            description: '[Flights] Destination Weather',
            url: '/app/visualize#/edit/293b5a30-4c8f-11e8-b3d7-01146121b73d',
          })
        );
      });

      it('propagates context for Vertical bar visualization', async () => {
        await assertLogContains(
          'execution context propagates to Elasticsearch via "x-opaque-id" header',
          (record) =>
            Boolean(
              record.http?.request?.id?.includes(
                'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;visualization:Vertical bar:9886b410-4c8b-11e8-b3d7-01146121b73d'
              )
            )
        );

        await assertLogContains('execution context propagates to Kibana logs', (record) =>
          isExecutionContextLog(record?.message, {
            parent: {
              type: 'application',
              name: 'dashboard',
              id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
              description: '[Flights] Global Flight Dashboard',
              url: '/view/7adfa750-4c81-11e8-b3d7-01146121b73d',
            },
            type: 'visualization',
            name: 'Vertical bar',
            id: '9886b410-4c8b-11e8-b3d7-01146121b73d',
            description: '[Flights] Delay Buckets',
            url: '/app/visualize#/edit/9886b410-4c8b-11e8-b3d7-01146121b73d',
          })
        );
      });
    });
  });
}
