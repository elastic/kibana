/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectTargetClusterType } from './detect_target_cluster_type';

describe('detectTargetClusterType', () => {
  describe('Serverless', () => {
    it('detects production Serverless (AWS)', () => {
      expect(
        detectTargetClusterType(
          'https://adbf8aa7744e4977836da61f5a43702a.fleet.eu-central-1.aws.elastic.cloud:443'
        )
      ).toBe('serverless');
    });

    it('detects staging Serverless (AWS)', () => {
      expect(
        detectTargetClusterType(
          'https://d625a3c317a2456aa1ca34c78af287c3.fleet.eu-west-1.aws.qa.elastic.cloud:443'
        )
      ).toBe('serverless');
    });
  });

  describe('ECH', () => {
    it('detects production ECH on found.io (AWS)', () => {
      expect(
        detectTargetClusterType(
          'https://cbe66fa0405648e0ba6046567645fc3c.fleet.eu-west-1.aws.found.io:443'
        )
      ).toBe('ech');
    });

    it('detects production ECH on cloud.es.io (GCP)', () => {
      expect(detectTargetClusterType('https://abc123.fleet.us-central1.gcp.cloud.es.io:443')).toBe(
        'ech'
      );
    });

    it('detects production ECH on elastic-cloud.com (Azure)', () => {
      expect(
        detectTargetClusterType('https://abc123.fleet.westeurope.azure.elastic-cloud.com:443')
      ).toBe('ech');
    });

    it('detects staging ECH on cld.elstc.co', () => {
      expect(
        detectTargetClusterType(
          'https://28aeec9401da418384149b4afdfea825.fleet.eu-west-1.aws.qa.cld.elstc.co:443'
        )
      ).toBe('ech');
    });

    it('detects legacy staging ECH on foundit.no', () => {
      expect(detectTargetClusterType('https://abc123.fleet.eu-west-1.aws.foundit.no:443')).toBe(
        'ech'
      );
    });
  });

  describe('unclassified (undefined)', () => {
    it('returns undefined for self-managed / custom domain', () => {
      expect(detectTargetClusterType('https://192.168.1.113:8220')).toBeUndefined();
    });

    it('returns undefined for localhost', () => {
      expect(detectTargetClusterType('https://localhost:8220')).toBeUndefined();
    });

    it('returns undefined for an invalid URL', () => {
      expect(detectTargetClusterType('not-a-url')).toBeUndefined();
    });
  });
});
