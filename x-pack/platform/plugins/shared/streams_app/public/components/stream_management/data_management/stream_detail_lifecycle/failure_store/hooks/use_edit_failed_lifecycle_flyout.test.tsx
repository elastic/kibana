/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import type { useFailureStoreConfig } from '../../hooks/use_failure_store_config';
import { LifecyclePreviewProvider } from '../../common/hooks/lifecycle_preview';
import { useEditFailedLifecycleFlyout } from './use_edit_failed_lifecycle_flyout';

jest.mock('../../common/hooks/use_inherited_stream_resource', () => ({
  useInheritedStreamResource: () => ({ data: null, reset: jest.fn() }),
}));

jest.mock('../../common/hooks/use_inherit_link', () => ({
  useInheritLink: () => undefined,
}));

type FailureStoreConfig = ReturnType<typeof useFailureStoreConfig>;

const createFailureStoreConfig = (
  overrides: Partial<FailureStoreConfig> = {}
): FailureStoreConfig => ({
  failureStoreEnabled: false,
  defaultRetentionPeriod: undefined,
  customRetentionPeriod: undefined,
  retentionDisabled: false,
  inheritOptions: {
    canShowInherit: false,
    isWired: false,
    isCurrentlyInherited: false,
  },
  ...overrides,
});

const createDefinition = (): Streams.ingest.all.GetResponse =>
  ({
    stream: {
      name: 'logs-test',
      ingest: { failure_store: { disabled: {} } },
    },
  } as unknown as Streams.ingest.all.GetResponse);

const createKibana = (isServerless: boolean) =>
  ({
    core: {
      notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
      http: {},
    },
    isServerless,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const Harness = ({
  isServerless,
  updateFailureStore,
}: {
  isServerless: boolean;
  updateFailureStore: jest.Mock;
}) => {
  const { mainFlyout, openMainFlyout } = useEditFailedLifecycleFlyout({
    definition: createDefinition(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { refresh: jest.fn() } as any,
    refreshDefinition: jest.fn(),
    failureStoreConfig: createFailureStoreConfig(),
    kibana: createKibana(isServerless),
    manageFailureStorePrivilege: true,
    updateFailureStore,
  });

  return (
    <>
      <button type="button" data-test-subj="openMainFlyout" onClick={openMainFlyout}>
        open
      </button>
      {mainFlyout}
    </>
  );
};

const renderHarness = (isServerless: boolean) => {
  const updateFailureStore = jest.fn().mockResolvedValue(undefined);
  render(
    <LifecyclePreviewProvider>
      <Harness isServerless={isServerless} updateFailureStore={updateFailureStore} />
    </LifecyclePreviewProvider>
  );
  return { updateFailureStore };
};

describe('useEditFailedLifecycleFlyout - saveMainFlyout', () => {
  it.each([
    ['Serverless', true],
    ['non-Serverless', false],
  ])(
    'enables the failure store with the default lifecycle (not a disabled lifecycle) in %s',
    async (_label, isServerless) => {
      const { updateFailureStore } = renderHarness(isServerless as boolean);

      fireEvent.click(screen.getByTestId('openMainFlyout'));
      fireEvent.click(screen.getByTestId('editFailedDataLifecycle-enableFailureStoreCheckbox'));
      fireEvent.click(screen.getByTestId('streamsEditDataLifecycleFlyoutApplyButton'));

      await waitFor(() => {
        expect(updateFailureStore).toHaveBeenCalledWith('logs-test', {
          lifecycle: { enabled: {} },
        });
      });
    }
  );
});
