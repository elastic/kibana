/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../meta', () => {
  return {
    getEMSClient: () => {
      class MockTMSService {
        constructor(config) {
          this._config = config;
        }
        getMarkdownAttribution() {
          return this._config.attributionMarkdown;
        }
        getId() {
          return this._config.id;
        }
      }

      return {
        async getTMSServices() {
          return [
            new MockTMSService({
              id: 'road_map',
              attributionMarkdown: '[foobar](http://foobar.org)  | [foobaz](http://foobaz.org)',
            }),
            new MockTMSService({
              id: 'satellite',
              attributionMarkdown: '[satellite](http://satellite.org)',
            }),
          ];
        },
      };
    },
  };
});

import { EMSTMSSource } from './ems_tms_source';

describe('EMSTMSSource', () => {
  it('should get attribution from markdown (tiles v2 legacy format)', async () => {
    const emsTmsSource = new EMSTMSSource({
      id: 'road_map',
    });

    const attributions = await emsTmsSource.getAttributions();
    expect(attributions).toEqual([
      {
        label: 'foobar',
        url: 'http://foobar.org',
      },
      {
        label: 'foobaz',
        url: 'http://foobaz.org',
      },
    ]);
  });
});
