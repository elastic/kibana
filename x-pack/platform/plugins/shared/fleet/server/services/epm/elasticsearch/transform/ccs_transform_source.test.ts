/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

import { appContextService } from '../../../app_context';
import { createAppContextStartContractMock } from '../../../../mocks';

import {
  isRemoteIndexExpression,
  removeRemoteClusterSourceIndicesOnServerless,
} from './ccs_transform_source';

describe('isRemoteIndexExpression', () => {
  it.each([
    ['*:metrics-endpoint.metadata_current_default*', true],
    ['remote1:logs-*', true],
    ['metrics-endpoint.metadata_current_default*', false],
    ['.fleet-agents*', false],
    // `::` is the data-stream selector separator, not a remote-cluster separator
    ['logs-endpoint.events::failures', false],
    ['logs::data', false],
    // date math is never remote — the ':' in a timezone must not be read as a cluster separator
    ['<logs-{now/d{yyyy.MM.dd|+12:00}}>', false],
    ['-<logs-{now/d}>', false],
    // a leading colon means the remote part is empty -> not a valid remote expression
    [':no-remote-name', false],
    ['', false],
  ])('classifies %s as remote=%s', (expression, expected) => {
    expect(isRemoteIndexExpression(expression as string)).toBe(expected);
  });
});

describe('removeRemoteClusterSourceIndicesOnServerless', () => {
  type TransformArg = Parameters<typeof removeRemoteClusterSourceIndicesOnServerless>[0];
  let logger: ReturnType<typeof loggerMock.create>;

  const buildTransform = (index: string | string[]): TransformArg =>
    ({
      installationName: 'endpoint.metadata_united-default-9.5.0-prerelease.1',
      content: { source: { index } },
    } as unknown as TransformArg);

  beforeEach(() => {
    logger = loggerMock.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('on serverless', () => {
    beforeEach(() => {
      appContextService.start(createAppContextStartContractMock({}, true));
    });

    it('strips remote (`*:`) entries from the source and logs the change', () => {
      const transform = buildTransform([
        'metrics-endpoint.metadata_current_default*',
        '*:metrics-endpoint.metadata_current_default*',
        '.fleet-agents*',
      ]);

      removeRemoteClusterSourceIndicesOnServerless(transform, logger);

      expect(transform.content.source?.index).toEqual([
        'metrics-endpoint.metadata_current_default*',
        '.fleet-agents*',
      ]);
      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('*:metrics-endpoint.metadata_current_default*')
      );
    });

    it('is a no-op when the source has no remote entry', () => {
      const transform = buildTransform([
        'metrics-endpoint.metadata_current_default*',
        '.fleet-agents*',
      ]);

      removeRemoteClusterSourceIndicesOnServerless(transform, logger);

      expect(transform.content.source?.index).toEqual([
        'metrics-endpoint.metadata_current_default*',
        '.fleet-agents*',
      ]);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('leaves a source made up solely of remote entries untouched', () => {
      const transform = buildTransform(['*:metrics-endpoint.metadata_current_default*']);

      removeRemoteClusterSourceIndicesOnServerless(transform, logger);

      expect(transform.content.source?.index).toEqual([
        '*:metrics-endpoint.metadata_current_default*',
      ]);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('does not strip transforms other than the Defend metadata_united transform', () => {
      const transform = {
        installationName: 'some_package.some_other_transform-default-1.0.0',
        content: { source: { index: ['metrics-foo-*', '*:metrics-foo-*'] } },
      } as unknown as TransformArg;

      removeRemoteClusterSourceIndicesOnServerless(transform, logger);

      expect(transform.content.source?.index).toEqual(['metrics-foo-*', '*:metrics-foo-*']);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('handles a single string source with no remote as a no-op', () => {
      const transform = buildTransform('metrics-endpoint.metadata_current_default*');

      removeRemoteClusterSourceIndicesOnServerless(transform, logger);

      expect(transform.content.source?.index).toBe('metrics-endpoint.metadata_current_default*');
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('does nothing when the transform content has no source index', () => {
      const transform = {
        installationName: 'endpoint.metadata_united-default-9.5.0-prerelease.1',
        content: {},
      } as unknown as TransformArg;

      expect(() => removeRemoteClusterSourceIndicesOnServerless(transform, logger)).not.toThrow();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('on stateful', () => {
    beforeEach(() => {
      appContextService.start(createAppContextStartContractMock());
    });

    it('preserves remote (`*:`) entries in the source', () => {
      const index = [
        'metrics-endpoint.metadata_current_default*',
        '*:metrics-endpoint.metadata_current_default*',
        '.fleet-agents*',
      ];
      const transform = buildTransform([...index]);

      removeRemoteClusterSourceIndicesOnServerless(transform, logger);

      expect(transform.content.source?.index).toEqual(index);
      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
