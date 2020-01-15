/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getServiceAnnotations } from '.';
import {
  SearchParamsMock,
  inspectSearchParams
} from '../../../../public/utils/testHelpers';
import noVersions from './__fixtures__/no-versions.json';
import oneVersion from './__fixtures__/one-version.json';
import multipleVersions from './__fixtures__/multiple-versions.json';
import versionsFirstSeen from './__fixtures__/versions-first-seen.json';

describe('getServiceAnnotations', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  describe('with 0 versions', () => {
    it('returns no annotations', async () => {
      mock = await inspectSearchParams(
        setup =>
          getServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar'
          }),
        {
          mockResponse: () => noVersions
        }
      );

      expect(mock.response).toEqual({ annotations: [] });
    });
  });

  describe('with 1 version', () => {
    it('returns no annotations', async () => {
      mock = await inspectSearchParams(
        setup =>
          getServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar'
          }),
        {
          mockResponse: () => oneVersion
        }
      );

      expect(mock.response).toEqual({ annotations: [] });
    });
  });

  describe('with more than 1 version', () => {
    it('returns two annotations', async () => {
      const responses = [
        multipleVersions,
        versionsFirstSeen,
        versionsFirstSeen
      ];
      mock = await inspectSearchParams(
        setup =>
          getServiceAnnotations({
            setup,
            serviceName: 'foo',
            environment: 'bar'
          }),
        {
          mockResponse: () => responses.shift()
        }
      );

      expect(mock.spy.mock.calls.length).toBe(3);

      expect(mock.response).toEqual({
        annotations: [
          {
            id: '8.0.0',
            text: '8.0.0',
            time: 1.5281138e12,
            type: 'version'
          },
          {
            id: '7.5.0',
            text: '7.5.0',
            time: 1.5281138e12,
            type: 'version'
          }
        ]
      });
    });
  });
});
