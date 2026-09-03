/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchFeature } from '@kbn/features-plugin/server';
import { uiCapabilitiesForFeatures } from '@kbn/features-plugin/server/ui_capabilities_for_features';

import { securityFeatures } from './security_features';

describe('securityFeatures', () => {
  describe('service accounts', () => {
    const serviceAccountsFeature = securityFeatures.find(
      (feature) => feature.id === 'service_accounts'
    )!;

    it('grants the `save` UI capability to holders of `manage_security`', () => {
      expect(serviceAccountsFeature.privileges).toEqual([
        { requiredClusterPrivileges: ['manage_security'], ui: ['save'] },
        { requiredClusterPrivileges: ['read_security'], ui: [] },
      ]);
    });

    it('declares the `service_accounts.save` capability', () => {
      const capabilities = uiCapabilitiesForFeatures(
        [],
        securityFeatures.map((feature) => new ElasticsearchFeature(feature))
      );

      expect(capabilities.service_accounts).toEqual({ save: true });
    });
  });
});
