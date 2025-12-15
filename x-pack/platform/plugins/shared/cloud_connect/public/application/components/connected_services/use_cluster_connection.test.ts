/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateServiceEnabled } from './use_cluster_connection';
import type { ClusterDetails } from '../../../types';

describe('use_cluster_connection', () => {
  describe('updateServiceEnabled', () => {
    const mockClusterDetails: ClusterDetails = {
      id: 'cluster-123',
      name: 'Test Cluster',
      metadata: {
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'user@example.com',
        organization_id: 'org-456',
        subscription: 'premium',
      },
      self_managed_cluster: {
        id: 'es-cluster-789',
        name: 'ES Cluster',
        version: '8.15.0',
      },
      license: {
        type: 'platinum',
        uid: 'license-uid-123',
      },
      services: {
        auto_ops: {
          enabled: false,
          support: {
            supported: true,
            minimum_stack_version: '8.0.0',
            valid_license_types: ['platinum', 'enterprise'],
          },
          config: {
            region_id: 'us-east-1',
          },
          metadata: {
            documentation_url: 'https://docs.elastic.co/auto-ops',
          },
          subscription: {
            required: true,
          },
        },
        eis: {
          enabled: true,
          support: {
            supported: true,
          },
        },
      },
    };

    it('should update enabled property for existing service', () => {
      const result = updateServiceEnabled(mockClusterDetails, 'auto_ops', true);

      expect(result).not.toBeNull();
      expect(result!.services.auto_ops?.enabled).toBe(true);
    });

    it('should preserve all other service properties', () => {
      const result = updateServiceEnabled(mockClusterDetails, 'auto_ops', true);

      expect(result).not.toBeNull();

      expect(result!.services.eis?.enabled).toBe(true);
    });

    it('should handle null clusterDetails gracefully', () => {
      const result = updateServiceEnabled(null, 'auto_ops', true);

      expect(result).toBeNull();
    });
  });
});
