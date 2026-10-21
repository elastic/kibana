/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { LensApi } from '@kbn/lens-plugin/public';
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '@kbn/alerts-ui-shared';
import { loadAlertRuleFlyoutContent } from './load_alert_rule_flyout_content';
import { getRuleFlyoutComponent } from './rule_flyout_component';
import type { ServiceDependencies } from './rule_flyout_component';

jest.mock('./rule_flyout_component', () => ({
  getRuleFlyoutComponent: jest.fn().mockResolvedValue(null),
}));

const mockGetRuleFlyoutComponent = getRuleFlyoutComponent as jest.MockedFunction<
  typeof getRuleFlyoutComponent
>;

const createEmbeddable = ({ esql, datatableSource }: { esql?: string; datatableSource?: string }) =>
  ({
    query$: new BehaviorSubject(esql ? { esql } : undefined),
    parentApi: undefined,
    getInspectorAdapters: () => ({
      tables: {
        tables: { default: { columns: [], rows: [], meta: { source: datatableSource } } },
      },
    }),
    getLegacySerializedState: () => ({ attributes: undefined }),
  } as unknown as LensApi);

const load = async (embeddable: LensApi, get: jest.Mock) => {
  await loadAlertRuleFlyoutContent({
    embeddable,
    closeFlyout: jest.fn(),
    startDependencies: { dataViews: { get } } as unknown as ServiceDependencies,
    ruleTypeRegistry: {} as RuleTypeRegistryContract,
    actionTypeRegistry: {} as ActionTypeRegistryContract,
  });
  const initialValues = mockGetRuleFlyoutComponent.mock.calls[0][5];
  return initialValues?.params as { esqlQuery: { esql: string }; timeField?: string };
};

describe('loadAlertRuleFlyoutContent', () => {
  beforeEach(() => {
    mockGetRuleFlyoutComponent.mockClear();
  });

  it('suggests the first index matched by the data view of the visualization', async () => {
    const get = jest.fn().mockResolvedValue({
      matchedIndices: ['logs-2026.10.01', 'logs-2026.10.02'],
      timeFieldName: '@timestamp',
    });

    const params = await load(createEmbeddable({ datatableSource: 'logs-data-view' }), get);

    expect(get).toHaveBeenCalledWith('logs-data-view', false);
    expect(params.esqlQuery.esql).toContain('FROM logs-2026.10.01');
    expect(params.timeField).toBe('@timestamp');
  });

  it('falls back to the missing query comment when the data view cannot be loaded', async () => {
    const get = jest.fn().mockRejectedValue(new Error('Saved object not found'));

    const params = await load(createEmbeddable({ datatableSource: 'gone' }), get);

    expect(params.esqlQuery.esql).toContain('Unable to generate an ES|QL query');
    expect(params.esqlQuery.esql).not.toContain('FROM');
  });

  it('does not look for a data view when the visualization has an ES|QL query', async () => {
    const get = jest.fn();

    const params = await load(
      createEmbeddable({ esql: 'FROM logs-* | LIMIT 5', datatableSource: 'logs-data-view' }),
      get
    );

    expect(get).not.toHaveBeenCalled();
    expect(params.esqlQuery.esql).toContain('FROM logs-* | LIMIT 5');
  });

  it('does not look for a data view when the data table has no source', async () => {
    const get = jest.fn();

    await load(createEmbeddable({}), get);

    expect(get).not.toHaveBeenCalled();
  });
});
