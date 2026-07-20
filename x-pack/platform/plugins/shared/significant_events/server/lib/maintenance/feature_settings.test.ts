/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';
import {
  hasFailedSettingsRestore,
  parseFailedSettingsRestores,
  shouldRestoreSettingsBackedWorkflow,
  shouldRevertSettingsBackedWorkflow,
} from './feature_settings';

describe('shouldRestoreSettingsBackedWorkflow', () => {
  it('restores continuous onboarding only when the setting was previously enabled', () => {
    expect(
      shouldRestoreSettingsBackedWorkflow(
        { id: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID, spaceId: 'default' },
        { continuousOnboardingWasEnabled: true, scheduledDiscoveryEnabledSpaceIds: [] }
      )
    ).toBe(true);
    expect(
      shouldRestoreSettingsBackedWorkflow(
        { id: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID, spaceId: 'default' },
        { continuousOnboardingWasEnabled: false, scheduledDiscoveryEnabledSpaceIds: [] }
      )
    ).toBe(false);
    expect(
      shouldRestoreSettingsBackedWorkflow(
        { id: LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID, spaceId: 'default' },
        { continuousOnboardingWasEnabled: true, scheduledDiscoveryEnabledSpaceIds: [] }
      )
    ).toBe(true);
  });

  it('restores scheduled discovery only for spaces that were previously enabled', () => {
    const scheduledId = `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-space-a`;
    expect(
      shouldRestoreSettingsBackedWorkflow(
        { id: scheduledId, spaceId: 'space-a' },
        {
          continuousOnboardingWasEnabled: false,
          scheduledDiscoveryEnabledSpaceIds: ['space-a'],
        }
      )
    ).toBe(true);
    expect(
      shouldRestoreSettingsBackedWorkflow(
        { id: scheduledId, spaceId: 'space-b' },
        {
          continuousOnboardingWasEnabled: false,
          scheduledDiscoveryEnabledSpaceIds: ['space-a'],
        }
      )
    ).toBe(false);
  });

  it('always restores workflows that are not gated by Settings toggles', () => {
    expect(
      shouldRestoreSettingsBackedWorkflow(
        { id: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID, spaceId: '*' },
        { continuousOnboardingWasEnabled: false, scheduledDiscoveryEnabledSpaceIds: [] }
      )
    ).toBe(true);
  });

  it('does not restore settings-backed workflows when pausedSettings is missing', () => {
    expect(
      shouldRestoreSettingsBackedWorkflow(
        { id: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID, spaceId: 'default' },
        undefined
      )
    ).toBe(false);
    expect(
      shouldRestoreSettingsBackedWorkflow(
        {
          id: `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-default`,
          spaceId: 'default',
        },
        undefined
      )
    ).toBe(false);
  });
});

describe('parseFailedSettingsRestores / shouldRevertSettingsBackedWorkflow', () => {
  it('parses continuous and per-space scheduled restore failures', () => {
    const failed = parseFailedSettingsRestores([
      { target: 'settings:continuous-onboarding', error: 'boom' },
      { target: 'settings:scheduled-discovery@space-a', error: 'boom' },
      { target: 'workflow:other@*', error: 'unrelated' },
    ]);
    expect(failed.continuousOnboarding).toBe(true);
    expect([...failed.scheduledDiscoverySpaceIds]).toEqual(['space-a']);
    expect(hasFailedSettingsRestore(failed)).toBe(true);
  });

  it('reverts only the settings-backed workflows that match failed restores', () => {
    const failed = parseFailedSettingsRestores([
      { target: 'settings:continuous-onboarding', error: 'boom' },
      { target: 'settings:scheduled-discovery@space-a', error: 'boom' },
    ]);
    expect(
      shouldRevertSettingsBackedWorkflow(
        { id: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID, spaceId: 'default' },
        failed
      )
    ).toBe(true);
    expect(
      shouldRevertSettingsBackedWorkflow(
        {
          id: `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-space-a`,
          spaceId: 'space-a',
        },
        failed
      )
    ).toBe(true);
    expect(
      shouldRevertSettingsBackedWorkflow(
        {
          id: `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-space-b`,
          spaceId: 'space-b',
        },
        failed
      )
    ).toBe(false);
    expect(
      shouldRevertSettingsBackedWorkflow(
        { id: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID, spaceId: '*' },
        failed
      )
    ).toBe(false);
  });

  it('reports no failed restores for an empty failure list', () => {
    const failed = parseFailedSettingsRestores([]);
    expect(hasFailedSettingsRestore(failed)).toBe(false);
  });
});
