/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { PublicMethodsOf } from '@kbn/utility-types';
import { coreMock } from '@kbn/core/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { savedObjectTaggingOssPluginMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';
import { SavedObjectTaggingPlugin } from './plugin';
import { SavedObjectsTaggingClientConfigRawType } from './config';
import { TagsCache } from './services';
import { tagsCacheMock } from './services/tags/tags_cache.mock';

jest.mock('./services/tags/tags_cache');
const MockedTagsCache = TagsCache as unknown as jest.Mock<PublicMethodsOf<TagsCache>>;

describe('SavedObjectTaggingPlugin', () => {
  let plugin: SavedObjectTaggingPlugin;
  let managementPluginSetup: ReturnType<typeof managementPluginMock.createSetupContract>;
  let savedObjectsTaggingOssPluginSetup: ReturnType<
    typeof savedObjectTaggingOssPluginMock.createSetup
  >;

  beforeEach(() => {
    const rawConfig: SavedObjectsTaggingClientConfigRawType = {
      cache_refresh_interval: moment.duration('15', 'minute').toString(),
    };
    const initializerContext = coreMock.createPluginInitializerContext(rawConfig);

    plugin = new SavedObjectTaggingPlugin(initializerContext);
  });

  describe('#setup', () => {
    beforeEach(() => {
      managementPluginSetup = managementPluginMock.createSetupContract();
      savedObjectsTaggingOssPluginSetup = savedObjectTaggingOssPluginMock.createSetup();

      plugin.setup(coreMock.createSetup(), {
        management: managementPluginSetup,
        savedObjectsTaggingOss: savedObjectsTaggingOssPluginSetup,
      });
    });

    it('register the `tags` app to the `kibana` management section', () => {
      expect(managementPluginSetup.sections.section.kibana.registerApp).toHaveBeenCalledTimes(1);
      expect(managementPluginSetup.sections.section.kibana.registerApp).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tags',
          title: 'Tags',
          mount: expect.any(Function),
        })
      );
    });
    it('register its API app to the `savedObjectsTaggingOss` plugin', () => {
      expect(savedObjectsTaggingOssPluginSetup.registerTaggingApi).toHaveBeenCalledTimes(1);
      expect(savedObjectsTaggingOssPluginSetup.registerTaggingApi).toHaveBeenCalledWith(
        expect.any(Promise)
      );
    });
  });

  describe('#start', () => {
    beforeEach(() => {
      managementPluginSetup = managementPluginMock.createSetupContract();
      savedObjectsTaggingOssPluginSetup = savedObjectTaggingOssPluginMock.createSetup();
      MockedTagsCache.mockImplementation(() => tagsCacheMock.create());

      plugin.setup(coreMock.createSetup(), {
        management: managementPluginSetup,
        savedObjectsTaggingOss: savedObjectsTaggingOssPluginSetup,
      });
    });

    it('creates its cache with correct parameters', () => {
      plugin.start(coreMock.createStart());

      expect(MockedTagsCache).toHaveBeenCalledTimes(1);
      expect(MockedTagsCache).toHaveBeenCalledWith({
        refreshHandler: expect.any(Function),
        refreshInterval: expect.any(Object),
      });

      const refreshIntervalParam = MockedTagsCache.mock.calls[0][0].refreshInterval;

      expect(moment.isDuration(refreshIntervalParam)).toBe(true);
      expect(refreshIntervalParam.toString()).toBe('PT15M');
    });

    it('initializes its cache if not on an anonymous page', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(false);

      plugin.start(coreStart);

      expect(MockedTagsCache.mock.instances[0].initialize).not.toHaveBeenCalled();
    });

    it('does not initialize its cache if on an anonymous page', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);

      plugin.start(coreStart);

      expect(MockedTagsCache.mock.instances[0].initialize).not.toHaveBeenCalled();
    });
  });
});
