/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getContentDestinationIndexName,
  getContentDestinationIndexAlias,
  getCAIContentBackfillTaskId,
  DOC_TYPES,
} from './constants';

describe('content_index constants', () => {
  describe('getContentDestinationIndexName', () => {
    it('generates correct index name for securitySolution (lowercased)', () => {
      expect(getContentDestinationIndexName('default', 'securitySolution')).toBe(
        '.internal.cases-analytics.securitysolution-default'
      );
    });

    it('generates correct index name for observability', () => {
      expect(getContentDestinationIndexName('my-space', 'observability')).toBe(
        '.internal.cases-analytics.observability-my-space'
      );
    });

    it('generates correct index name for cases (stack)', () => {
      expect(getContentDestinationIndexName('default', 'cases')).toBe(
        '.internal.cases-analytics.cases-default'
      );
    });

    it('lowercases both spaceId and owner', () => {
      expect(getContentDestinationIndexName('MySpace', 'securitySolution')).toBe(
        '.internal.cases-analytics.securitysolution-myspace'
      );
    });
  });

  describe('getContentDestinationIndexAlias', () => {
    it('generates correct alias for securitySolution (lowercased)', () => {
      expect(getContentDestinationIndexAlias('default', 'securitySolution')).toBe(
        '.cases-analytics.securitysolution-default'
      );
    });

    it('generates correct alias for observability', () => {
      expect(getContentDestinationIndexAlias('my-space', 'observability')).toBe(
        '.cases-analytics.observability-my-space'
      );
    });

    it('generates correct alias for cases (stack)', () => {
      expect(getContentDestinationIndexAlias('default', 'cases')).toBe(
        '.cases-analytics.cases-default'
      );
    });
  });

  describe('getCAIContentBackfillTaskId', () => {
    it('generates a unique task id per owner and space', () => {
      expect(getCAIContentBackfillTaskId('default', 'securitySolution')).toBe(
        'cai_content_backfill_task-securitySolution-default'
      );
      expect(getCAIContentBackfillTaskId('default', 'observability')).toBe(
        'cai_content_backfill_task-observability-default'
      );
    });
  });

  describe('DOC_TYPES', () => {
    it('has expected discriminator values', () => {
      expect(DOC_TYPES.CASE).toBe('case');
      expect(DOC_TYPES.COMMENT).toBe('comment');
      expect(DOC_TYPES.ATTACHMENT).toBe('attachment');
    });
  });
});
