/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { z as z4 } from '@kbn/zod/v4';
import type { ActionType } from '../../../common';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { listSpecSummaries } from './list_spec_summaries';

const spec = {
  metadata: {
    id: '.spec-type',
    displayName: 'Spec type',
    description: 'A spec type',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: null,
  schema: null,
  actions: { listThings: { isTool: true, input: z4.object({}), handler: async () => ({}) } },
  test: { handler: async () => ({}), enabled: false },
} as unknown as ConnectorSpec;

const row = (id: string, source: ActionType['source']): ActionType => ({
  id,
  name: id,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: [],
  isSystemActionType: false,
  source,
  isDeprecated: false,
});

describe('listSpecSummaries', () => {
  it('returns a summary for spec-backed types only', () => {
    const registry = actionTypeRegistryMock.create();
    registry.list.mockReturnValue([
      row('.spec-type', ACTION_TYPE_SOURCES.spec),
      row('.stack', ACTION_TYPE_SOURCES.stack),
    ]);
    registry.getSpec.mockImplementation((id: string) => (id === '.spec-type' ? spec : undefined));

    const summaries = listSpecSummaries(registry);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toEqual(
      expect.objectContaining({
        id: '.spec-type',
        displayName: 'Spec type',
        actions: [{ name: 'listThings', isTool: true, scope: 'read' }],
      })
    );
  });
});
