/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementAppLocatorDefinition } from '@kbn/management-plugin/common/locator';
import { IngestPipelinesLocatorDefinition, INGEST_PIPELINES_PAGES } from './locator';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

describe('Ingest pipeline locator', () => {
  const setup = () => {
    const managementDefinition = new ManagementAppLocatorDefinition();
    const definition = new IngestPipelinesLocatorDefinition({
      managementAppLocator: {
        ...sharePluginMock.createLocator(),
        getLocation: (params) => managementDefinition.getLocation(params),
        getUrl: async () => {
          throw new Error('not implemented');
        },
        navigate: async () => {
          throw new Error('not implemented');
        },
        useUrl: () => '',
      },
    });
    return { definition };
  };

  describe('Pipelines List', () => {
    it('generates relative url for list without pipelineId', async () => {
      const { definition } = setup();
      const location = await definition.getLocation({
        page: INGEST_PIPELINES_PAGES.LIST,
      });

      expect(location).toMatchObject({
        app: 'management',
        path: '/ingest/ingest_pipelines',
      });
    });

    it('generates relative url for list with a pipelineId', async () => {
      const { definition } = setup();
      const location = await definition.getLocation({
        page: INGEST_PIPELINES_PAGES.LIST,
        pipelineId: 'pipeline_name',
      });

      expect(location).toMatchObject({
        app: 'management',
        path: '/ingest/ingest_pipelines/?pipeline=pipeline_name',
      });
    });
  });

  describe('Pipeline Edit', () => {
    it('generates relative url for pipeline edit', async () => {
      const { definition } = setup();
      const location = await definition.getLocation({
        page: INGEST_PIPELINES_PAGES.EDIT,
        pipelineId: 'pipeline_name',
      });

      expect(location).toMatchObject({
        app: 'management',
        path: '/ingest/ingest_pipelines/edit/pipeline_name',
      });
    });
  });

  describe('Pipeline Clone', () => {
    it('generates relative url for pipeline clone', async () => {
      const { definition } = setup();
      const location = await definition.getLocation({
        page: INGEST_PIPELINES_PAGES.CLONE,
        pipelineId: 'pipeline_name',
      });

      expect(location).toMatchObject({
        app: 'management',
        path: '/ingest/ingest_pipelines/create/pipeline_name',
      });
    });
  });

  describe('Pipeline Create', () => {
    it('generates relative url for pipeline create', async () => {
      const { definition } = setup();
      const location = await definition.getLocation({
        page: INGEST_PIPELINES_PAGES.CREATE,
        pipelineId: 'pipeline_name',
      });

      expect(location).toMatchObject({
        app: 'management',
        path: '/ingest/ingest_pipelines/create',
      });
    });
  });
});
