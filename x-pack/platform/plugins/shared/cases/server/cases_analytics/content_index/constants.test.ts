/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import {
  getContentIndexName,
  getActivityIndexName,
  getContentDestinationIndexName,
  getAnalyticsActivityDestinationIndexName,
  DOC_TYPES,
} from './constants';

describe('content_index constants', () => {
  describe('getContentIndexName (public alias)', () => {
    it('generates correct index name for securitysolution', () => {
      expect(getContentIndexName('securitysolution', 'default')).toBe(
        '.cases-analytics.securitysolution-default'
      );
    });

    it('generates correct index name for observability', () => {
      expect(getContentIndexName('observability', 'my-space')).toBe(
        '.cases-analytics.observability-my-space'
      );
    });

    it('generates correct index name for cases (stack)', () => {
      expect(getContentIndexName('cases', 'default')).toBe('.cases-analytics.cases-default');
    });
  });

  describe('getActivityIndexName (public alias)', () => {
    it('generates correct activity index name for securitysolution', () => {
      expect(getActivityIndexName('securitysolution', 'default')).toBe(
        '.cases-analytics-activity.securitysolution-default'
      );
    });

    it('generates correct activity index name for observability', () => {
      expect(getActivityIndexName('observability', 'my-space')).toBe(
        '.cases-analytics-activity.observability-my-space'
      );
    });
  });

  describe('getContentDestinationIndexName (hidden internal index)', () => {
    it('generates correct internal index name', () => {
      expect(getContentDestinationIndexName('default', SECURITY_SOLUTION_OWNER)).toBe(
        '.internal.cases-analytics.securitysolution-default'
      );
    });
  });

  describe('getAnalyticsActivityDestinationIndexName (hidden internal index)', () => {
    it('generates correct internal activity index name', () => {
      expect(getAnalyticsActivityDestinationIndexName('default', SECURITY_SOLUTION_OWNER)).toBe(
        '.internal.cases-analytics-activity.securitysolution-default'
      );
    });
  });

  describe('DOC_TYPES', () => {
    it('has expected values', () => {
      expect(DOC_TYPES.CASE).toBe('case');
      expect(DOC_TYPES.COMMENT).toBe('comment');
      expect(DOC_TYPES.ATTACHMENT).toBe('attachment');
    });
  });
});
