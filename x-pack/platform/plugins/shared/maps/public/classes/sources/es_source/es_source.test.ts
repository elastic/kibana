/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../kibana_services');

import { of } from 'rxjs';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { ISearchSource } from '@kbn/data-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import { getInspector, getUiSettings } from '../../../kibana_services';
import { AbstractESSource } from './es_source';

const rawResponseWithEmptyRemote = {
  took: 5,
  timed_out: false,
  _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
  _clusters: {
    total: 2,
    successful: 1,
    skipped: 1,
    running: 0,
    partial: 0,
    failed: 0,
    details: {
      remote_ok: {
        status: 'successful',
        indices: 'remote_ok:logs-myapp',
        took: 3,
        timed_out: false,
        _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
      },
      remote_empty: {
        status: 'skipped',
        indices: 'remote_empty:logs-myapp',
        took: 0,
        timed_out: false,
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
      },
    },
  },
  hits: { hits: [] },
};

describe('AbstractESSource', () => {
  describe('_runEsQuery warnings for a cluster with no index matching the pattern', () => {
    const runEsQuery = (onWarning: jest.Mock) => {
      const source = new AbstractESSource(
        AbstractESSource.createDescriptor({ indexPatternId: 'foo' })
      );
      return source._runEsQuery({
        registerCancelCallback: jest.fn(),
        requestId: 'request-1',
        requestName: 'My request',
        searchSource: {
          fetch$: () => of({ rawResponse: rawResponseWithEmptyRemote }),
        } as unknown as ISearchSource,
        executionContext: { name: 'maps' } as KibanaExecutionContext,
        requestsAdapter: new RequestAdapter(),
        onWarning,
      });
    };

    const mockIgnoreEmptyClustersSetting = (value: boolean) => {
      (getUiSettings as jest.Mock).mockReturnValue({
        get: (key: string) =>
          key === UI_SETTINGS.SEARCH_IGNORE_EMPTY_CLUSTERS ? value : undefined,
      });
    };

    beforeEach(() => {
      (getInspector as jest.Mock).mockReturnValue({});
    });

    it('reports a warning when the ignore empty clusters setting is off', async () => {
      mockIgnoreEmptyClustersSetting(false);
      const onWarning = jest.fn();

      await runEsQuery(onWarning);

      expect(onWarning).toHaveBeenCalledTimes(1);
    });

    it('does not report a warning when the ignore empty clusters setting is on', async () => {
      mockIgnoreEmptyClustersSetting(true);
      const onWarning = jest.fn();

      await runEsQuery(onWarning);

      expect(onWarning).not.toHaveBeenCalled();
    });
  });
});
