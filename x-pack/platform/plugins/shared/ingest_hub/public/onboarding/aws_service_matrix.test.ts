/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AwsServiceMatrixEntry,
  DeliveryMethod,
  SignalType,
  ServiceCategory,
} from './aws_service_matrix';
import { AWS_SERVICES_MATRIX } from './aws_service_matrix';

const VALID_SIGNAL_TYPES: SignalType[] = ['logs', 'metrics'];
const VALID_DELIVERY_METHODS: DeliveryMethod[] = ['agentless', 'firehose', 'cloud_forwarder'];
const VALID_CATEGORIES: ServiceCategory[] = [
  'Analytics',
  'Application Integration',
  'Cloud Financial Management',
  'Compute',
  'Containers',
  'Databases',
  'Machine Learning',
  'Management and Governance',
  'Networking and Content Delivery',
  'Security, Identity and Compliance',
  'Storage',
];

describe('AWS_SERVICES_MATRIX', () => {
  it('should have at least 40 entries', () => {
    expect(AWS_SERVICES_MATRIX.length).toBeGreaterThanOrEqual(40);
  });

  it('should have no duplicate ids', () => {
    const ids = AWS_SERVICES_MATRIX.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  describe.each(
    AWS_SERVICES_MATRIX.map((entry) => [entry.id, entry] as [string, AwsServiceMatrixEntry])
  )('service "%s"', (_id, entry) => {
    it('has a non-empty id', () => {
      expect(entry.id).toBeTruthy();
    });

    it('has a non-empty name', () => {
      expect(entry.name).toBeTruthy();
    });

    it('has a valid category', () => {
      expect(VALID_CATEGORIES).toContain(entry.category);
    });

    it('has a valid signalType', () => {
      expect(VALID_SIGNAL_TYPES).toContain(entry.signalType);
    });

    it('has at least one delivery method', () => {
      expect(entry.deliveryMethods.length).toBeGreaterThanOrEqual(1);
    });

    it('has only valid delivery method values', () => {
      entry.deliveryMethods.forEach(({ method }) => {
        expect(VALID_DELIVERY_METHODS).toContain(method);
      });
    });

    it('has exactly one preferred delivery method', () => {
      const preferred = entry.deliveryMethods.filter((dm) => dm.preferred === true);
      expect(preferred).toHaveLength(1);
    });

    it('has a non-empty packageName', () => {
      expect(entry.packageName).toBeTruthy();
    });

    it('has a boolean defaultEnabled', () => {
      expect(typeof entry.defaultEnabled).toBe('boolean');
    });

    it('has a boolean showInUI', () => {
      expect(typeof entry.showInUI).toBe('boolean');
    });
  });
});
