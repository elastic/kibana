/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { AiIndexDest } from '../../../common/http_api/ai_indices';
import type { ContextEngineServices } from './use_kibana';
import { useAiIndexDestLinks } from './use_ai_index_dest_links';

const INDEX_DEST: AiIndexDest = { type: 'index', value: 'ai-index-idx-sample-ki' };
const DATA_STREAM_DEST: AiIndexDest = { type: 'data_stream', value: 'ai-index-ds-sample' };
const PATTERN_DEST: AiIndexDest = { type: 'index', value: 'ai-index-idx-*' };

const DISCOVER_HREF = '/app/discover#/?esql';
const INDEX_MANAGEMENT_HREF = '/app/management/data/index_management/indices/index_details';

interface RenderOptions {
  discoverShow?: boolean;
  indexManagementMonitor?: boolean;
}

const renderUseAiIndexDestLinks = (
  dest: AiIndexDest | undefined,
  { discoverShow = true, indexManagementMonitor = true }: RenderOptions = {}
) => {
  const core = coreMock.createStart();
  const share = sharePluginMock.createStartContract();
  core.application.capabilities = {
    ...core.application.capabilities,
    discover_v2: { show: discoverShow },
    index_management: {
      ...core.application.capabilities.index_management,
      monitor: indexManagementMonitor,
    },
  };

  const discoverLocator = sharePluginMock.createLocator();
  discoverLocator.getRedirectUrl.mockReturnValue(DISCOVER_HREF);
  const indexManagementLocator = sharePluginMock.createLocator();
  indexManagementLocator.getUrl.mockResolvedValue(INDEX_MANAGEMENT_HREF);

  jest.spyOn(share.url.locators, 'get').mockImplementation((locatorId: string) => {
    if (locatorId === DISCOVER_APP_LOCATOR) {
      return discoverLocator;
    }
    if (locatorId === INDEX_MANAGEMENT_LOCATOR_ID) {
      return indexManagementLocator;
    }
    return undefined;
  });

  const services = { ...core, share } as CoreStart & { share: ContextEngineServices['share'] };
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(KibanaContextProvider, { services }, children);

  const rendered = renderHook(() => useAiIndexDestLinks(dest), { wrapper });

  return {
    ...rendered,
    discoverLocator,
    indexManagementLocator,
  };
};

describe('useAiIndexDestLinks', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns empty destValue and no links when dest is undefined', () => {
    const { result } = renderUseAiIndexDestLinks(undefined);

    expect(result.current).toEqual({
      destValue: '',
      discoverHref: undefined,
      indexManagementHref: undefined,
    });
  });

  it('builds a Discover link when Discover is available', async () => {
    const { result, discoverLocator } = renderUseAiIndexDestLinks(INDEX_DEST);

    expect(result.current.destValue).toBe(INDEX_DEST.value);
    expect(result.current.discoverHref).toBe(DISCOVER_HREF);
    expect(discoverLocator.getRedirectUrl).toHaveBeenCalledWith({
      timeRange: { from: 'now-90d', to: 'now' },
      query: { esql: `FROM ${INDEX_DEST.value} | LIMIT 100` },
    });
    await waitFor(() => {
      expect(result.current.indexManagementHref).toBe(INDEX_MANAGEMENT_HREF);
    });
  });

  it('omits the Discover link when Discover is hidden', async () => {
    const { result, discoverLocator } = renderUseAiIndexDestLinks(INDEX_DEST, {
      discoverShow: false,
    });

    expect(result.current.discoverHref).toBeUndefined();
    expect(discoverLocator.getRedirectUrl).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.indexManagementHref).toBe(INDEX_MANAGEMENT_HREF);
    });
  });

  it('resolves an index management link for a concrete index dest', async () => {
    const { result, indexManagementLocator } = renderUseAiIndexDestLinks(INDEX_DEST);

    await waitFor(() => {
      expect(result.current.indexManagementHref).toBe(INDEX_MANAGEMENT_HREF);
    });
    expect(indexManagementLocator.getUrl).toHaveBeenCalledWith(
      {
        page: 'index_details',
        indexName: INDEX_DEST.value,
      },
      undefined
    );
  });

  it('resolves an index management link for a data stream dest', async () => {
    const { result, indexManagementLocator } = renderUseAiIndexDestLinks(DATA_STREAM_DEST);

    await waitFor(() => {
      expect(result.current.indexManagementHref).toBe(INDEX_MANAGEMENT_HREF);
    });
    expect(indexManagementLocator.getUrl).toHaveBeenCalledWith(
      {
        page: 'data_streams_details',
        dataStreamName: DATA_STREAM_DEST.value,
      },
      undefined
    );
  });

  it('omits the index management link for index patterns', () => {
    const { result, indexManagementLocator } = renderUseAiIndexDestLinks(PATTERN_DEST);

    expect(result.current.indexManagementHref).toBeUndefined();
    expect(indexManagementLocator.getUrl).not.toHaveBeenCalled();
  });

  it('omits the index management link when index management monitor is unavailable', () => {
    const { result, indexManagementLocator } = renderUseAiIndexDestLinks(INDEX_DEST, {
      indexManagementMonitor: false,
    });

    expect(result.current.indexManagementHref).toBeUndefined();
    expect(indexManagementLocator.getUrl).not.toHaveBeenCalled();
  });
});
