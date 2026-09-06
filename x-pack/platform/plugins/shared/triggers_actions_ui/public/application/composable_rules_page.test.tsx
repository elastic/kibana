/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import { createStartServicesMock } from '../common/lib/kibana/kibana_react.mock';
import { triggersActionsUiMock } from '../mocks';
import { ComposableClassicRulesPage } from './composable_rules_page';
import { RulesPageApp } from './rules_page_app';
import type { ClassicRulesPageInternalDeps } from './classic_rules_page';
import type { TriggersAndActionsUiServices } from './rules_app';

jest.mock('./rules_page_app', () => ({
  RulesPageApp: jest.fn(() => <div data-test-subj="rulesPageApp" />),
}));

const rulesPageAppMock = RulesPageApp as jest.MockedFunction<typeof RulesPageApp>;

const getLatestDeps = (): TriggersAndActionsUiServices => {
  const lastCall = rulesPageAppMock.mock.calls.at(-1);
  if (!lastCall) {
    throw new Error('RulesPageApp was not rendered');
  }
  return lastCall[0].deps;
};

const createInternalDeps = (getFeatures: jest.Mock): ClassicRulesPageInternalDeps => {
  const services = createStartServicesMock();
  return {
    actions: services.actions,
    security: services.security,
    cloud: services.cloud,
    actionTypeRegistry: services.actionTypeRegistry,
    ruleTypeRegistry: services.ruleTypeRegistry,
    isServerless: services.isServerless,
    pluginsStart: {
      data: services.data,
      dataViews: services.dataViews,
      dataViewEditor: services.dataViewEditor,
      charts: services.charts,
      alerting: services.alerting,
      spaces: services.spaces,
      unifiedSearch: services.unifiedSearch,
      licensing: services.licensing,
      expressions: services.expressions,
      fieldFormats: services.fieldFormats,
      lens: services.lens,
      fieldsMetadata: services.fieldsMetadata,
      contentManagement: services.contentManagement,
      share: services.share,
      uiActions: services.uiActions,
      cps: services.cps,
      inspector: services.inspector,
      features: { getFeatures },
    },
  };
};

describe('ComposableClassicRulesPage', () => {
  const coreStart = coreMock.createStart();
  const setBreadcrumbs = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders RulesPageApp with composed deps and fetched kibana features', async () => {
    const features = [{ id: 'apm', name: 'APM' }] as KibanaFeature[];
    const getFeatures = jest.fn().mockResolvedValue(features);
    const history = scopedHistoryMock.create();

    render(
      <ComposableClassicRulesPage
        coreStart={coreStart}
        setBreadcrumbs={setBreadcrumbs}
        history={history}
        internalDeps={createInternalDeps(getFeatures)}
      />
    );

    await waitFor(() => {
      expect(getLatestDeps().kibanaFeatures).toEqual(features);
    });

    const deps = getLatestDeps();
    expect(deps.setBreadcrumbs).toBe(setBreadcrumbs);
    expect(deps.history).toBe(history);
    expect(getFeatures).toHaveBeenCalledTimes(1);
  });

  it('falls back to empty kibanaFeatures when getFeatures rejects', async () => {
    const getFeatures = jest.fn().mockRejectedValue(new Error('Forbidden'));

    render(
      <ComposableClassicRulesPage
        coreStart={coreStart}
        setBreadcrumbs={setBreadcrumbs}
        internalDeps={createInternalDeps(getFeatures)}
      />
    );

    await waitFor(() => {
      expect(getLatestDeps().kibanaFeatures).toEqual([]);
    });
  });

  it('uses a memory history when the host does not pass history', async () => {
    const getFeatures = jest.fn().mockResolvedValue([]);

    render(
      <ComposableClassicRulesPage
        coreStart={coreStart}
        setBreadcrumbs={setBreadcrumbs}
        internalDeps={createInternalDeps(getFeatures)}
      />
    );

    await waitFor(() => {
      expect(getLatestDeps().history).toEqual(
        expect.objectContaining({
          push: expect.any(Function),
          replace: expect.any(Function),
          listen: expect.any(Function),
        })
      );
    });
  });

  it('does not apply features after unmount', async () => {
    const features = [{ id: 'apm', name: 'APM' }] as KibanaFeature[];
    let resolveFeatures: (value: KibanaFeature[]) => void = () => {};
    const getFeatures = jest.fn(
      () =>
        new Promise<KibanaFeature[]>((resolve) => {
          resolveFeatures = resolve;
        })
    );

    const { unmount } = render(
      <ComposableClassicRulesPage
        coreStart={coreStart}
        setBreadcrumbs={setBreadcrumbs}
        internalDeps={createInternalDeps(getFeatures)}
      />
    );

    unmount();
    resolveFeatures(features);

    await Promise.resolve();
    expect(getLatestDeps().kibanaFeatures).toEqual([]);
  });
});

describe('getClassicRulesPage start contract', () => {
  it('returns a stable component identity across calls', () => {
    const start = triggersActionsUiMock.createStart();
    expect(start.getClassicRulesPage()).toBe(start.getClassicRulesPage());
  });
});
