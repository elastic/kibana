/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ContentPackSavedObject, ContentPackSavedObjectLinks } from '@kbn/content-packs-schema';
import { savedObjectLinks } from './saved_object';

describe('Saved object helpers', () => {
  describe('savedObjectLinks', () => {
    it('reuses existing link', () => {
      const existingLinks = {
        dashboards: [
          {
            source_id: 'foo',
            target_id: 'foo-copy',
            references: [{ source_id: 'index1', target_id: 'index1-copy' }],
          },
        ],
      } as ContentPackSavedObjectLinks;

      const links = savedObjectLinks(
        [
          { type: 'dashboard', id: 'foo', references: [{ type: 'index-pattern', id: 'index1' }] },
          { type: 'index-pattern', id: 'index1' },
        ] as ContentPackSavedObject[],
        existingLinks
      );

      expect(links).toEqual({
        dashboards: [
          {
            source_id: 'foo',
            target_id: 'foo-copy',
            references: [{ source_id: 'index1', target_id: 'index1-copy' }],
          },
        ],
      });
    });

    it('generates new ids when no existing links', () => {
      const existingLinks = { dashboards: [] } as ContentPackSavedObjectLinks;

      const links = savedObjectLinks(
        [
          { type: 'dashboard', id: 'foo', references: [{ type: 'index-pattern', id: 'index1' }] },
          { type: 'index-pattern', id: 'index1' },
        ] as ContentPackSavedObject[],
        existingLinks
      );

      const expectUuid = expect.stringMatching(
        /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/
      );

      expect(links).toEqual({
        dashboards: [
          {
            source_id: 'foo',
            target_id: expectUuid,
            references: [{ source_id: 'index1', target_id: expectUuid }],
          },
        ],
      });
    });

    it('generates a unique id for duplicated references', () => {
      const existingLinks = { dashboards: [] } as ContentPackSavedObjectLinks;

      const links = savedObjectLinks(
        [
          {
            type: 'dashboard',
            id: 'foo',
            references: [
              { type: 'index-pattern', id: 'index1' },
              { type: 'index-pattern', id: 'index1' },
            ],
          },
          { type: 'index-pattern', id: 'index1' },
        ] as ContentPackSavedObject[],
        existingLinks
      );

      const expectUuid = expect.stringMatching(
        /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/
      );

      expect(links).toEqual({
        dashboards: [
          {
            source_id: 'foo',
            target_id: expectUuid,
            references: [{ source_id: 'index1', target_id: expectUuid }],
          },
        ],
      });
    });

    it('does not generate a link for references not included', () => {
      const existingLinks = { dashboards: [] } as ContentPackSavedObjectLinks;

      const links = savedObjectLinks(
        [
          {
            type: 'dashboard',
            id: 'foo',
            references: [{ type: 'index-pattern', id: 'index1' }],
          },
        ] as ContentPackSavedObject[],
        existingLinks
      );

      const expectUuid = expect.stringMatching(
        /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/
      );

      expect(links).toEqual({
        dashboards: [
          {
            source_id: 'foo',
            target_id: expectUuid,
            references: [],
          },
        ],
      });
    });
  });
});
