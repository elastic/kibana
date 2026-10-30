/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { AppDeepLinkLocations, Capabilities, CoreStart } from '@kbn/core/public';
import { AppStatus } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import {
  getRulesAppUpdate,
  getRulesManagementVisibleIn,
  getRulesManagementVisibleIn$,
} from './get_rules_app_update';

const buildCapabilities = (insightsAndAlerting: Record<string, boolean>): Capabilities =>
  ({
    navLinks: {},
    catalogue: {},
    management: { insightsAndAlerting },
  } as unknown as Capabilities);

describe('getRulesAppUpdate', () => {
  it('keeps the Rules app accessible in the side nav when the user has rules access', () => {
    const capabilities = buildCapabilities({ triggersActionsRules: true });

    expect(getRulesAppUpdate(capabilities)).toEqual({
      status: AppStatus.accessible,
      visibleIn: ['projectSideNav'],
    });
  });

  it('hides and disables the Rules app when the rules management capability is disabled (e.g. stackAlertsOnly)', () => {
    const capabilities = buildCapabilities({
      triggersActionsRules: false,
      triggersActionsAlerts: true,
    });

    expect(getRulesAppUpdate(capabilities)).toEqual({
      status: AppStatus.inaccessible,
      visibleIn: [],
    });
  });

  it('hides and disables the Rules app when the rules management capability is absent', () => {
    const capabilities = buildCapabilities({ triggersActionsAlerts: true });

    expect(getRulesAppUpdate(capabilities)).toEqual({
      status: AppStatus.inaccessible,
      visibleIn: [],
    });
  });

  it('hides and disables the Rules app when the insightsAndAlerting management section is missing', () => {
    const capabilities = {
      navLinks: {},
      catalogue: {},
      management: {},
    } as unknown as Capabilities;

    expect(getRulesAppUpdate(capabilities)).toEqual({
      status: AppStatus.inaccessible,
      visibleIn: [],
    });
  });
});

describe('getRulesManagementVisibleIn', () => {
  const SEARCHABLE = ['globalSearch', 'projectSideNav'];

  const createCoreStart = ({ canReadV2Rules = true }: { canReadV2Rules?: boolean } = {}) => {
    const coreStart = coreMock.createStart();
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      alerting_v2_rules: { read: canReadV2Rules },
    };
    return coreStart;
  };

  it('keeps Stack Management Rules in global search while alerting v2 is disabled', () => {
    expect(
      getRulesManagementVisibleIn(createCoreStart(), {
        alertingV2Enabled: false,
        solutionNavId: 'oblt',
      })
    ).toEqual(SEARCHABLE);
  });

  it.each([['oblt'], [null]])(
    'drops Stack Management Rules from global search in the %s solution view',
    (solutionNavId) => {
      expect(
        getRulesManagementVisibleIn(createCoreStart(), { alertingV2Enabled: true, solutionNavId })
      ).toEqual(['projectSideNav']);
    }
  );

  it.each([['security'], ['es']])(
    'keeps Stack Management Rules in global search in the %s solution view',
    (solutionNavId) => {
      expect(
        getRulesManagementVisibleIn(createCoreStart(), { alertingV2Enabled: true, solutionNavId })
      ).toEqual(SEARCHABLE);
    }
  );

  it('keeps Stack Management Rules in global search when the user cannot read alerting v2 rules', () => {
    expect(
      getRulesManagementVisibleIn(createCoreStart({ canReadV2Rules: false }), {
        alertingV2Enabled: true,
        solutionNavId: 'oblt',
      })
    ).toEqual(SEARCHABLE);
  });
});

describe('getRulesManagementVisibleIn$', () => {
  const createCoreStart = ({ declared = true }: { declared?: boolean } = {}) => {
    const coreStart = coreMock.createStart();
    const alertingV2Enabled$ = new BehaviorSubject(false);
    const solutionNavId$ = new BehaviorSubject<
      ReturnType<CoreStart['chrome']['getActiveSolutionNavId']>
    >('oblt');
    const { globalClient } = coreStart.settings;

    globalClient.isDeclared.mockReturnValue(declared);
    // Deliberately stale: the stream must use the emitted value, not re-read the client.
    globalClient.get.mockReturnValue(false);
    globalClient.get$.mockReturnValue(alertingV2Enabled$);
    coreStart.chrome.getActiveSolutionNavId$.mockReturnValue(solutionNavId$);
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      alerting_v2_rules: { read: true },
    };

    return { coreStart, alertingV2Enabled$, solutionNavId$ };
  };

  const collect = (coreStart: ReturnType<typeof createCoreStart>['coreStart']) => {
    const emissions: AppDeepLinkLocations[][] = [];
    const subscription = getRulesManagementVisibleIn$(coreStart).subscribe((visibleIn) =>
      emissions.push(visibleIn)
    );
    return { emissions, subscription };
  };

  it('updates visibleIn when the alerting v2 setting is toggled', () => {
    const { coreStart, alertingV2Enabled$ } = createCoreStart();
    const { emissions, subscription } = collect(coreStart);

    alertingV2Enabled$.next(true);
    alertingV2Enabled$.next(false);
    subscription.unsubscribe();

    expect(emissions).toEqual([
      ['globalSearch', 'projectSideNav'],
      ['projectSideNav'],
      ['globalSearch', 'projectSideNav'],
    ]);
  });

  it('updates visibleIn when the active solution changes', () => {
    const { coreStart, alertingV2Enabled$, solutionNavId$ } = createCoreStart();
    alertingV2Enabled$.next(true);
    const { emissions, subscription } = collect(coreStart);

    solutionNavId$.next('security');
    solutionNavId$.next('oblt');
    subscription.unsubscribe();

    expect(emissions).toEqual([
      ['projectSideNav'],
      ['globalSearch', 'projectSideNav'],
      ['projectSideNav'],
    ]);
  });

  it('keeps Stack Management Rules searchable when the alerting v2 setting is not declared', () => {
    const { coreStart } = createCoreStart({ declared: false });
    const { emissions, subscription } = collect(coreStart);
    subscription.unsubscribe();

    expect(coreStart.settings.globalClient.get$).not.toHaveBeenCalled();
    expect(emissions).toEqual([['globalSearch', 'projectSideNav']]);
  });
});
