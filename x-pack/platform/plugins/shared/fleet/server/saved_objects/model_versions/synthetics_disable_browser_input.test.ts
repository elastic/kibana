/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectModelTransformationContext,
} from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../types';

import { disableBrowserInputWhenBothEnabled } from './synthetics_disable_browser_input';

describe('package-policy model-version: disableBrowserInputWhenBothEnabled', () => {
  const ctx = {} as SavedObjectModelTransformationContext;

  it('disables the browser input when both inputs are enabled', () => {
    const pkgPolicyDoc: SavedObject<PackagePolicy> = {
      id: 'policy1',
      type: 'ingest-package-policies',
      references: [],
      attributes: {
        id: 'policy1',
        name: 'Uptime policy',
        namespace: 'default',
        enabled: true,
        is_managed: false,
        policy_id: 'agent-policy',
        package: { name: 'synthetics', title: 'Elastic Synthetics', version: '1.0.0' },
        inputs: [
          { type: 'synthetics/browser', enabled: true, streams: [], vars: {} },
          { type: 'synthetics/http', enabled: true, streams: [], vars: {} },
        ],
        revision: 1,
        created_at: '2025-09-23T00:00:00Z',
        created_by: 'elastic',
        updated_at: '2025-09-23T00:00:00Z',
        updated_by: 'elastic',
      } as unknown as PackagePolicy,
    };

    const migrated = disableBrowserInputWhenBothEnabled(pkgPolicyDoc, ctx);

    const browser = migrated.document.attributes.inputs?.find(
      (i) => i.type === 'synthetics/browser'
    );
    expect(browser?.enabled).toBe(false);
    const http = migrated.document.attributes.inputs?.find((i) => i.type === 'synthetics/http');
    expect(http?.enabled).toBe(true);
  });

  it('leaves document unchanged for non-synthetics package', () => {
    const otherDoc: SavedObject<PackagePolicy> = {
      id: 'policy2',
      type: 'ingest-package-policies',
      references: [],
      attributes: {
        id: 'policy2',
        name: 'System policy',
        namespace: 'default',
        enabled: true,
        is_managed: false,
        policy_id: 'agent-policy',
        package: { name: 'system', title: 'System', version: '1.0.0' },
        inputs: [{ type: 'system/metrics', enabled: true, streams: [], vars: {} }],
        revision: 1,
        created_at: '2025-09-23T00:00:00Z',
        created_by: 'elastic',
        updated_at: '2025-09-23T00:00:00Z',
        updated_by: 'elastic',
      } as unknown as PackagePolicy,
    };

    const migrated = disableBrowserInputWhenBothEnabled(otherDoc, ctx);

    expect(migrated.document).toEqual(otherDoc);
  });

  it('does nothing when only one input is enabled', () => {
    const pkgPolicyDoc: SavedObject<PackagePolicy> = {
      id: 'policy3',
      type: 'ingest-package-policies',
      references: [],
      attributes: {
        id: 'policy3',
        name: 'Uptime policy',
        namespace: 'default',
        enabled: true,
        is_managed: false,
        policy_id: 'agent-policy',
        package: { name: 'synthetics', title: 'Elastic Synthetics', version: '1.0.0' },
        inputs: [
          { type: 'synthetics/browser', enabled: false, streams: [], vars: {} },
          { type: 'synthetics/http', enabled: true, streams: [], vars: {} },
        ],
        revision: 1,
        created_at: '2025-09-23T00:00:00Z',
        created_by: 'elastic',
        updated_at: '2025-09-23T00:00:00Z',
        updated_by: 'elastic',
      } as unknown as PackagePolicy,
    };

    const migrated = disableBrowserInputWhenBothEnabled(pkgPolicyDoc, ctx);

    expect(migrated.document).toEqual(pkgPolicyDoc);
  });
});
