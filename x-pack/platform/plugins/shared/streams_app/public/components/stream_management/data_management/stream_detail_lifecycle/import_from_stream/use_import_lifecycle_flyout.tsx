/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { omit } from 'lodash';
import type {
  EffectiveFailureStore,
  FailureStore,
  IngestStreamEffectiveLifecycle,
  IngestStreamLifecycle,
  Streams,
} from '@kbn/streams-schema';
import { isIlmLifecycle } from '@kbn/streams-schema';
import type { CoreStart } from '@kbn/core/public';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import type { IlmPolicyForFlyout } from '@kbn/data-lifecycle-phases';
import { InspectIlmPolicyFlyout } from '@kbn/data-lifecycle-phases';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';
import { getFormattedError } from '../../../../../util/errors';
import { getStreamTypeFromDefinition } from '../../../../../util/get_stream_type_from_definition';
import { getLifecycleFlyoutContainer } from '../common/get_lifecycle_flyout_container';
import { useOverrideSettingsConfirmation } from '../common/hooks/use_override_settings_confirmation';
import { ImportLifecycleFlyout } from '../data_phases/import_lifecycle_flyout';
import type { ImportLifecycleMethod } from '../data_phases/import_lifecycle_flyout/constants';
import { buildImportRetentionOptions } from './build_retention_options';
import { getImportedFailureStore } from './get_imported_failure_store';
import { getImportedLifecycle } from './get_imported_lifecycle';
import { useImportLifecycleFlyoutContext } from './import_lifecycle_flyout_context';

const EMPTY_STREAMS: ListStreamDetail[] = [];

const getIlmPolicies = async ({
  http,
  signal,
}: {
  http: CoreStart['http'];
  signal: AbortSignal;
}): Promise<PolicyFromES[]> => {
  return http.get('/api/index_lifecycle_management/policies', {
    headers: { 'X-Elastic-Internal-Origin': 'Kibana' },
    signal,
  });
};

const mapIlmPolicyToFlyout = (policy: PolicyFromES): IlmPolicyForFlyout => ({
  name: policy.name,
  phases: policy.policy.phases,
  serializedPolicy: policy.policy,
});

export interface UseImportLifecycleFlyoutArgs {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}

export const useImportLifecycleFlyout = ({
  definition,
  refreshDefinition,
}: UseImportLifecycleFlyoutArgs) => {
  const {
    core,
    isServerless,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    services: { telemetryClient },
  } = useKibana();
  const { notifications, http, application } = core;
  const { signal } = useAbortController();

  const importContext = useImportLifecycleFlyoutContext();
  const isOpen = importContext?.isOpen ?? false;
  const close = importContext?.close;

  const titleId = useGeneratedHtmlId({ prefix: 'streamsImportLifecycleFlyoutTitle' });

  const [selectedStreamName, setSelectedStreamName] = useState<string | undefined>(undefined);
  const [selectedMethods, setSelectedMethods] = useState<ImportLifecycleMethod[]>([]);
  const [inspectedStreamName, setInspectedStreamName] = useState<string | null>(null);
  const [ilmPolicies, setIlmPolicies] = useState<IlmPolicyForFlyout[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const hasAttemptedIlmPoliciesFetch = useRef(false);

  const targetIsTimeSeries = definition.index_mode === 'time_series';

  const { value: streamsList, loading: isLoadingStreams } = useStreamsAppFetch(
    async ({ signal: fetchSignal }) => {
      if (!isOpen) {
        return undefined;
      }
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal: fetchSignal,
      });
      return streams;
    },
    [isOpen, streamsRepositoryClient],
    { withTimeRange: false, withRefresh: false }
  );

  const streams = streamsList ?? EMPTY_STREAMS;

  const ilmPoliciesByName = useMemo(() => {
    const map = new Map<string, IlmPolicyForFlyout>();
    ilmPolicies.forEach((policy) => map.set(policy.name, policy));
    return map;
  }, [ilmPolicies]);

  const options = useMemo(
    () =>
      buildImportRetentionOptions({
        streams,
        currentStreamName: definition.stream.name,
        ilmPoliciesByName,
        isServerless,
      }),
    [definition.stream.name, ilmPoliciesByName, isServerless, streams]
  );
  const hasImportableStreams = !isOpen || options.length > 0;

  useEffect(() => {
    if (!isOpen || isServerless || hasAttemptedIlmPoliciesFetch.current) {
      return;
    }
    hasAttemptedIlmPoliciesFetch.current = true;
    getIlmPolicies({ http, signal })
      .then((policies) => setIlmPolicies(policies.map(mapIlmPolicyToFlyout)))
      .catch((error) => {
        setIlmPolicies([]);
        if (signal.aborted) {
          hasAttemptedIlmPoliciesFetch.current = false;
          return;
        }
        notifications.toasts.addError(getFormattedError(error), {
          title: i18n.translate('xpack.streams.importLifecycle.failedToLoadIlmPolicies', {
            defaultMessage: 'Failed to load ILM policies',
          }),
        });
      });
  }, [http, isOpen, isServerless, notifications.toasts, signal]);

  useEffect(() => {
    if (isOpen) {
      setSelectedStreamName(undefined);
      setSelectedMethods([]);
      setInspectedStreamName(null);
    } else {
      hasAttemptedIlmPoliciesFetch.current = false;
    }
  }, [isOpen]);

  const closeFlyout = useCallback(() => {
    setInspectedStreamName(null);
    close?.();
  }, [close]);

  const { confirmOverride, modal: overrideModal } = useOverrideSettingsConfirmation({ definition });

  const selectedStream = selectedStreamName
    ? streams.find((stream) => stream.stream.name === selectedStreamName)
    : undefined;
  const inspectedStream = inspectedStreamName
    ? streams.find((stream) => stream.stream.name === inspectedStreamName)
    : undefined;
  const selectedEffectiveLifecycle = selectedStream?.effective_lifecycle;
  const inspectedEffectiveLifecycle = inspectedStream?.effective_lifecycle;
  const inspectedIlmPolicyName =
    inspectedEffectiveLifecycle && isIlmLifecycle(inspectedEffectiveLifecycle)
      ? inspectedEffectiveLifecycle.ilm.policy
      : null;

  const canReadFailureStoreForImport = useCallback(
    (stream: ListStreamDetail | undefined): boolean => {
      return Boolean(stream?.privileges.read_failure_store);
    },
    []
  );

  const getImportableFailureStore = useCallback(
    (stream: ListStreamDetail | undefined): FailureStore | undefined => {
      if (!stream?.effective_failure_store) {
        return undefined;
      }

      if (!canReadFailureStoreForImport(stream)) {
        return undefined;
      }

      return getImportedFailureStore(stream.effective_failure_store);
    },
    [canReadFailureStoreForImport]
  );

  const previewLifecycle: IngestStreamEffectiveLifecycle | null = inspectedIlmPolicyName
    ? { ilm: { policy: inspectedIlmPolicyName } }
    : selectedEffectiveLifecycle ?? null;

  const previewFailureStore: EffectiveFailureStore | null =
    (inspectedStream ?? selectedStream)?.effective_failure_store ?? null;

  const onInspect = useCallback(
    (streamName: string) => {
      const stream = streams.find((item) => item.stream.name === streamName);
      const effectiveLifecycle = stream?.effective_lifecycle;
      if (effectiveLifecycle && isIlmLifecycle(effectiveLifecycle)) {
        setInspectedStreamName(streamName);
      }
    },
    [streams]
  );

  const saveImportedLifecycle = useCallback(
    async (lifecycle: IngestStreamLifecycle, failureStore?: FailureStore) => {
      try {
        setIsSaving(true);
        await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
          params: {
            path: { name: definition.stream.name },
            body: {
              ingest: {
                ...definition.stream.ingest,
                processing: omit(definition.stream.ingest.processing, 'updated_at'),
                lifecycle,
                ...(failureStore ? { failure_store: failureStore } : {}),
              },
            },
          },
          signal,
        });

        telemetryClient.trackRetentionChanged(
          lifecycle,
          getStreamTypeFromDefinition(definition.stream)
        );
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.streams.importLifecycle.success', {
            defaultMessage: 'Stream lifecycle imported',
          }),
        });
        refreshDefinition();
        closeFlyout();
      } catch (error) {
        notifications.toasts.addError(getFormattedError(error), {
          title: i18n.translate('xpack.streams.importLifecycle.failed', {
            defaultMessage: 'Failed to import lifecycle',
          }),
        });
      } finally {
        setIsSaving(false);
      }
    },
    [
      closeFlyout,
      definition.stream,
      notifications.toasts,
      refreshDefinition,
      signal,
      streamsRepositoryClient,
      telemetryClient,
    ]
  );

  const saveImportedStream = useCallback(
    (stream: ListStreamDetail | undefined) => {
      const effectiveLifecycle = stream?.effective_lifecycle;
      if (!effectiveLifecycle || !canReadFailureStoreForImport(stream)) {
        return;
      }

      const lifecycle = getImportedLifecycle({
        effectiveLifecycle,
        targetIsTimeSeries,
      });
      if (!lifecycle) {
        return;
      }

      const failureStore = getImportableFailureStore(stream);
      const targetMethod = 'ilm' in lifecycle ? 'ilm' : 'dlm';
      confirmOverride(() => saveImportedLifecycle(lifecycle, failureStore), { targetMethod });
    },
    [
      canReadFailureStoreForImport,
      confirmOverride,
      getImportableFailureStore,
      saveImportedLifecycle,
      targetIsTimeSeries,
    ]
  );

  const onApply = useCallback(() => {
    saveImportedStream(selectedStream);
  }, [saveImportedStream, selectedStream]);

  const isApplyDisabled =
    !definition.privileges.lifecycle ||
    !selectedStreamName ||
    isSaving ||
    !canReadFailureStoreForImport(selectedStream);

  const inspectedPolicy = inspectedIlmPolicyName
    ? ilmPoliciesByName.get(inspectedIlmPolicyName)
    : undefined;
  const inspectFlyout =
    isOpen && inspectedIlmPolicyName && inspectedPolicy?.serializedPolicy ? (
      <InspectIlmPolicyFlyout
        policyName={inspectedIlmPolicyName}
        policy={inspectedPolicy.serializedPolicy}
        onBack={() => setInspectedStreamName(null)}
        onEditPolicy={(policyToEdit) =>
          application.navigateToApp('management', {
            path: `data/index_lifecycle_management/policies/edit/${encodeURIComponent(
              policyToEdit
            )}`,
            openInNewTab: true,
          })
        }
        primaryAction={{
          label: i18n.translate('xpack.streams.importLifecycle.inspectIlmPolicy.applyLabel', {
            defaultMessage: 'Apply',
          }),
          onClick: () => {
            setInspectedStreamName(null);
            saveImportedStream(inspectedStream);
          },
          'data-test-subj': 'streamsImportLifecycleInspectApplyButton',
          isDisabled: isSaving || !canReadFailureStoreForImport(inspectedStream),
        }}
        type="push"
        container={getLifecycleFlyoutContainer()}
        ownFocus={false}
      />
    ) : null;

  const flyout = !isOpen ? null : (
    <>
      <ImportLifecycleFlyout
        titleId={titleId}
        options={options}
        selectedOptionName={selectedStreamName}
        onSelectOption={setSelectedStreamName}
        onInspect={onInspect}
        isLoadingStreams={isLoadingStreams}
        selectedMethods={selectedMethods}
        onChangeSelectedMethods={setSelectedMethods}
        onApply={onApply}
        onClose={closeFlyout}
        isApplyDisabled={isApplyDisabled}
        canUseDownsampling={targetIsTimeSeries}
      />

      {inspectFlyout}
      {overrideModal}
    </>
  );

  return {
    isOpen,
    flyout,
    previewLifecycle,
    previewFailureStore,
    ilmPolicies,
    hasImportableStreams,
    isLoadingStreams,
  };
};
