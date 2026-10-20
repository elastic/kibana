/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import type { EpisodeDataSource } from '@kbn/alerting-v2-episodes-ui/types/episode_data_source';
import { useAdditionalEpisodesDataSource } from '@kbn/alerting-v2-episodes-ui/context/episode_data_source_context';
import { useAlertHost } from '@kbn/alerting-v2-episodes-ui/context/alert_host_context';
import { AlertingV2AlertsProvider } from './alerts_provider';
import { CLASSIC_ALERTS_DATA_SOURCE } from '../alert_sources';

jest.mock('@kbn/core-di-browser', () => ({
  ...jest.requireActual('@kbn/core-di-browser'),
  useService: () => ({ canRead: () => true, canWrite: () => true }),
  Context: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
}));

const composeMounts: Array<{ mode: string; ruleId: string }> = [];

jest.mock('./compose_rule_flyout', () => ({
  __esModule: true,
  default: ({ target }: { target: { mode: string; rule: { id: string } } }) => {
    const { useEffect: onMount } = jest.requireActual('react');
    onMount(() => {
      composeMounts.push({ mode: target.mode, ruleId: target.rule.id });
    }, []);
    return null;
  },
}));

jest.mock('../components/rule/flyouts/rule_summary/rule_summary_flyout_container', () => ({
  RuleSummaryFlyoutContainer: ({ onEdit }: { onEdit: (rule: { id: string }) => void }) => (
    <button type="button" data-test-subj="editRule" onClick={() => onEdit({ id: 'rule-1' })}>
      edit
    </button>
  ),
}));

jest.mock('./bind_locators_to_host', () => ({
  getAlertingV2Locators: jest.fn(() => ({})),
  bindLocatorsToHost: jest.fn(() => ({
    rulesLocators: { getRedirectUrl: jest.fn(() => '/rule') },
    episodesLocators: { getRedirectUrl: jest.fn(() => '/alert') },
  })),
}));

const container = { get: jest.fn(() => ({})) } as never;
const coreStart = {
  notifications: { toasts: {} },
  http: { basePath: { prepend: (p: string) => p } },
  application: {},
} as never;

let seen: { dataSource?: EpisodeDataSource; canWriteAlerts?: boolean } = {};

const Probe = () => {
  seen = {
    dataSource: useAdditionalEpisodesDataSource(),
    canWriteAlerts: useAlertHost().canWriteAlerts,
  };
  return null;
};

const renderProvider = (props: Partial<React.ComponentProps<typeof AlertingV2AlertsProvider>>) =>
  render(
    <AlertingV2AlertsProvider
      coreStart={coreStart}
      container={container}
      hostApp={{} as never}
      {...props}
    >
      <Probe />
    </AlertingV2AlertsProvider>
  );

describe('AlertingV2AlertsProvider', () => {
  beforeEach(() => {
    seen = {};
    composeMounts.length = 0;
  });

  it("merges Observability's classic alerts by default", () => {
    renderProvider({});

    expect(seen.dataSource).toBe(CLASSIC_ALERTS_DATA_SOURCE);
  });

  it('lets a host supply its own alert source instead', () => {
    const dataSource = { id: 'security' } as unknown as EpisodeDataSource;

    renderProvider({ dataSource });

    expect(seen.dataSource).toBe(dataSource);
  });

  it('merges host actions into whichever source is used', () => {
    const dataSource = { id: 'security' } as unknown as EpisodeDataSource;
    const createActions = jest.fn(() => []);

    renderProvider({ dataSource, createActions });

    expect(seen.dataSource).toEqual({ id: 'security', createActions });
  });

  it('reports the write privilege to the alert components', () => {
    renderProvider({});

    expect(seen.canWriteAlerts).toBe(true);
  });

  describe('rule editing', () => {
    const openRuleAndEdit = async (host: { openRuleFlyout?: (id: string) => void }) => {
      await act(async () => host.openRuleFlyout!('rule-1'));
      await act(async () => {
        screen.getByTestId('editRule').click();
      });
    };

    it('opens the compose flyout again when the same rule is edited twice', async () => {
      let host: { openRuleFlyout?: (id: string) => void } = {};
      const Capture = () => {
        host = useAlertHost() as typeof host;
        return null;
      };

      render(
        <AlertingV2AlertsProvider coreStart={coreStart} container={container} hostApp={{} as never}>
          <Capture />
        </AlertingV2AlertsProvider>
      );

      await openRuleAndEdit(host);
      await openRuleAndEdit(host);

      expect(composeMounts).toEqual([
        { mode: 'edit', ruleId: 'rule-1' },
        { mode: 'edit', ruleId: 'rule-1' },
      ]);
    });
  });
});
