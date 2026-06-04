/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams, IngestStreamLifecycle } from '@kbn/streams-schema';
import {
  Streams as StreamsSchema,
  effectiveToIngestLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isRoot,
} from '@kbn/streams-schema';
import type { DataLifecycleMethod, IlmPolicyForFlyout } from '@kbn/data-lifecycle-phases';
import {
  buildDataLifecycleApplyPayload,
  EditDataLifecycleFlyoutBody,
  FlyoutFooterWithRetentionWarning,
  useRetentionWarning,
} from '@kbn/data-lifecycle-phases';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import type { CoreStart } from '@kbn/core/public';
import { useGeneratedHtmlId } from '@elastic/eui';
import { isEqual } from 'lodash';
import { InspectIlmPolicyFlyout } from '@kbn/data-lifecycle-phases';
import { useLifecyclePreview } from '../../common/hooks/lifecycle_preview';
import { useInheritedStreamResource } from '../../common/hooks/use_inherited_stream_resource';
import { useInheritLink } from '../../common/hooks/use_inherit_link';
import { useOverrideSettingsConfirmation } from '../../common/hooks/use_override_settings_confirmation';
import { LifecycleFlyout } from '../../common/lifecycle_flyout';
import { getLifecycleFlyoutContainer } from '../../common/get_lifecycle_flyout_container';
import { computeSuccessfulLifecycleFlyoutPreview } from '../../common/data_lifecycle/compute_successful_lifecycle_flyout_preview';
import type { IlmPhasesMap } from '../../common/data_lifecycle/preview_models';

const getIlmPolicies = async ({
  http,
  signal,
}: {
  http: CoreStart['http'];
  signal: AbortSignal;
}): Promise<PolicyFromES[]> => {
  return await http.get('/api/index_lifecycle_management/policies', {
    headers: { 'X-Elastic-Internal-Origin': 'Kibana' },
    signal,
  });
};

const mapIlmPolicyToFlyout = (policy: PolicyFromES): IlmPolicyForFlyout => {
  return {
    name: policy.name,
    phases: policy.policy.phases,
    serializedPolicy: policy.policy,
  };
};

export interface UseEditSuccessfulLifecycleFlyoutArgs {
  definition: Streams.ingest.all.GetResponse;
  stats?: { size?: string; sizeBytes?: number; totalDocs?: number };
  core: CoreStart;
  http: CoreStart['http'];
  application: CoreStart['application'];
  isServerless: boolean;
  euiTheme: { colors: { severity: { success: string } } };
  ilmPhases: IlmPhasesMap;
  signal: AbortSignal;
  updateLifecycle: (lifecycle: IngestStreamLifecycle) => Promise<boolean>;
  updateInProgress: boolean;
  /**
   * True when another flyout (e.g. delete phase flyout) is driving the preview.
   */
  isOtherFlyoutOpen: boolean;
}

export const useEditSuccessfulLifecycleFlyout = ({
  definition,
  stats,
  core,
  http,
  application,
  isServerless,
  euiTheme,
  ilmPhases,
  signal,
  updateLifecycle,
  updateInProgress,
  isOtherFlyoutOpen,
}: UseEditSuccessfulLifecycleFlyoutArgs) => {
  const {
    setDataPhasesCount,
    setDownsampleStepsCount,
    setHasUnsavedChanges,
    setIsActive,
    setRetentionPeriod,
    setTimelineModel,
    clearPreview,
  } = useLifecyclePreview();

  const titleId = useGeneratedHtmlId({
    prefix: 'streamsEditSuccessfulDataLifecycleFlyoutTitle',
  });

  const [isOpen, setIsOpen] = useState(false);
  const [inheritLifecycle, setInheritLifecycle] = useState(false);
  const [method, setMethod] = useState<DataLifecycleMethod>('dlm');
  const [selectedIlmPolicyName, setSelectedIlmPolicyName] = useState<string | undefined>(undefined);
  const [ilmPolicies, setIlmPolicies] = useState<IlmPolicyForFlyout[]>([]);
  const [isLoadingIlmPolicies, setIsLoadingIlmPolicies] = useState(false);
  const [inspectedIlmPolicyName, setInspectedIlmPolicyName] = useState<string | null>(null);
  const selectedPolicyNameAtInspectRef = useRef<string | undefined>(undefined);

  const canShowInherit = !(
    StreamsSchema.WiredStream.GetResponse.is(definition) && isRoot(definition.stream.name)
  );

  const inheritedFetchEnabled = isOpen && !isServerless && canShowInherit;

  const { data: inheritedEffectiveLifecycle, reset: resetInheritedEffectiveLifecycle } =
    useInheritedStreamResource({
      http,
      path: `/internal/streams/${encodeURIComponent(definition.stream.name)}/lifecycle/_inherited`,
      enabled: inheritedFetchEnabled,
      mapResponse: (response) =>
        (response as { lifecycle: Streams.ingest.all.GetResponse['effective_lifecycle'] })
          .lifecycle,
    });

  const hotColor = isServerless ? euiTheme.colors.severity.success : ilmPhases.hot.color;

  const openFlyout = useCallback(() => {
    if (isOtherFlyoutOpen) {
      return;
    }

    const nextInherit = isInheritLifecycle(definition.stream.ingest.lifecycle);
    const nextMethod: DataLifecycleMethod = isIlmLifecycle(definition.effective_lifecycle)
      ? 'ilm'
      : 'dlm';
    const nextPolicyName = isIlmLifecycle(definition.effective_lifecycle)
      ? definition.effective_lifecycle.ilm.policy
      : undefined;

    setInheritLifecycle(nextInherit);
    setMethod(nextMethod);
    setSelectedIlmPolicyName(nextPolicyName);
    resetInheritedEffectiveLifecycle();
    setIsOpen(true);

    if (!isServerless && !isLoadingIlmPolicies && ilmPolicies.length === 0) {
      setIsLoadingIlmPolicies(true);
      getIlmPolicies({ http, signal })
        .then((policies) => setIlmPolicies(policies.map(mapIlmPolicyToFlyout)))
        .catch((error) => {
          setIlmPolicies([]);
          // Ignore aborts (e.g. the flyout closed before the request resolved).
          if (signal.aborted) {
            return;
          }
          // Surface the failure so an empty policy list isn't mistaken for
          // "no policies exist".
          core.notifications.toasts.addError(error, {
            title: i18n.translate('xpack.streams.editSuccessfulLifecycle.failedToLoadIlmPolicies', {
              defaultMessage: 'Failed to load ILM policies',
            }),
          });
        })
        .finally(() => setIsLoadingIlmPolicies(false));
    }
  }, [
    core.notifications.toasts,
    definition.effective_lifecycle,
    definition.stream.ingest.lifecycle,
    http,
    ilmPolicies.length,
    isLoadingIlmPolicies,
    isOtherFlyoutOpen,
    isServerless,
    resetInheritedEffectiveLifecycle,
    signal,
  ]);

  const closeInspectFlyout = useCallback(() => {
    setInspectedIlmPolicyName(null);
  }, []);

  const closeFlyout = useCallback(() => {
    closeInspectFlyout();
    setIsOpen(false);
  }, [closeInspectFlyout]);

  const onChangeInheritLifecycle = useCallback(
    (next: boolean) => {
      if (next) {
        if (inheritedEffectiveLifecycle) {
          setInheritLifecycle(true);
          if (isIlmLifecycle(inheritedEffectiveLifecycle)) {
            setMethod('ilm');
            setSelectedIlmPolicyName(inheritedEffectiveLifecycle.ilm.policy);
          } else {
            setMethod('dlm');
            setSelectedIlmPolicyName(undefined);
          }
          return;
        }
        setSelectedIlmPolicyName(undefined);
        setInheritLifecycle(true);
        resetInheritedEffectiveLifecycle();
        return;
      }
      setInheritLifecycle(false);
    },
    [inheritedEffectiveLifecycle, resetInheritedEffectiveLifecycle]
  );

  useEffect(() => {
    if (!inheritLifecycle || inheritedEffectiveLifecycle) {
      return;
    }
    setSelectedIlmPolicyName(undefined);
  }, [inheritLifecycle, inheritedEffectiveLifecycle]);

  useEffect(() => {
    if (!inheritLifecycle || !inheritedEffectiveLifecycle) {
      return;
    }
    if (isIlmLifecycle(inheritedEffectiveLifecycle)) {
      setMethod('ilm');
      setSelectedIlmPolicyName(inheritedEffectiveLifecycle.ilm.policy);
      return;
    }
    setMethod('dlm');
    setSelectedIlmPolicyName(undefined);
  }, [inheritLifecycle, inheritedEffectiveLifecycle]);

  const inheritLabel = StreamsSchema.WiredStream.GetResponse.is(definition)
    ? i18n.translate('xpack.streams.editSuccessfulLifecycle.inheritFromParentLabel', {
        defaultMessage: 'Inherit lifecycle from parent stream',
      })
    : i18n.translate('xpack.streams.editSuccessfulLifecycle.inheritFromIndexTemplateLabel', {
        defaultMessage: 'Inherit lifecycle from index template',
      });

  const inheritLink = useInheritLink(definition, {
    classicIndexTemplate: i18n.translate(
      'xpack.streams.editSuccessfulLifecycle.viewIndexTemplateLinkLabel',
      { defaultMessage: 'View index template' }
    ),
    wiredParentStream: i18n.translate(
      'xpack.streams.editSuccessfulLifecycle.viewParentStreamLinkLabel',
      { defaultMessage: 'View parent stream' }
    ),
  });

  const retentionWarning = useRetentionWarning({
    ilmPolicies,
    selectedIlmPolicyName: method === 'ilm' ? selectedIlmPolicyName : undefined,
    canUseDownsampling: definition.index_mode === 'time_series',
    inheritLifecycle,
  });

  const { confirmOverride, modal: overrideModal } = useOverrideSettingsConfirmation({
    definition,
  });

  const openInspectPolicy = useCallback(
    (policyName: string) => {
      selectedPolicyNameAtInspectRef.current = selectedIlmPolicyName;
      setInspectedIlmPolicyName(policyName);
    },
    [selectedIlmPolicyName]
  );

  const applyPayload = useMemo(() => {
    if (!isOpen) return null;
    return buildDataLifecycleApplyPayload({
      inheritLifecycle,
      method,
      ilmPolicyName: selectedIlmPolicyName,
    });
  }, [inheritLifecycle, isOpen, method, selectedIlmPolicyName]);

  const nextLifecycle: IngestStreamLifecycle | undefined = useMemo(() => {
    if (!applyPayload) return undefined;

    if (applyPayload.inheritLifecycle) {
      return { inherit: {} };
    }

    if (applyPayload.method === 'ilm') {
      return { ilm: { policy: applyPayload.ilmPolicyName } };
    }

    const baseline = effectiveToIngestLifecycle(definition.effective_lifecycle);
    if ('dsl' in baseline) return baseline;
    return { dsl: {} };
  }, [applyPayload, definition.effective_lifecycle]);

  const isApplyDisabled = useMemo(() => {
    if (!definition.privileges.lifecycle) return true;
    if (!applyPayload) return true;
    if (!nextLifecycle) return true;
    return isEqual(definition.stream.ingest.lifecycle, nextLifecycle) || updateInProgress;
  }, [
    applyPayload,
    definition.privileges.lifecycle,
    definition.stream.ingest.lifecycle,
    nextLifecycle,
    updateInProgress,
  ]);

  const flyoutPreview = useMemo(() => {
    if (!isOpen) {
      return null;
    }
    return computeSuccessfulLifecycleFlyoutPreview({
      inheritLifecycle,
      inheritedEffectiveLifecycle,
      method,
      selectedIlmPolicyName,
      inspectedIlmPolicyName,
      selectedIlmPolicyNameAtInspect: selectedPolicyNameAtInspectRef.current,
      ilmPolicies,
      effectiveLifecycle: definition.effective_lifecycle,
      indexMode: definition.index_mode,
      isServerless,
      ilmPhases,
      hotColor,
      stats,
    });
  }, [
    definition.effective_lifecycle,
    definition.index_mode,
    hotColor,
    ilmPhases,
    ilmPolicies,
    inheritLifecycle,
    inheritedEffectiveLifecycle,
    inspectedIlmPolicyName,
    isOpen,
    isServerless,
    method,
    selectedIlmPolicyName,
    stats,
  ]);

  useEffect(() => {
    if (!isOpen || !flyoutPreview) {
      return;
    }

    setIsActive(true);

    const hasEdits = nextLifecycle
      ? !isEqual(definition.stream.ingest.lifecycle, nextLifecycle)
      : false;

    if (flyoutPreview.action === 'clear') {
      clearPreview();
      setHasUnsavedChanges(hasEdits && !updateInProgress);
      return;
    }

    if (flyoutPreview.suppressUnsavedChanges) {
      setHasUnsavedChanges(false);
    } else {
      setHasUnsavedChanges(hasEdits && !updateInProgress);
    }

    setTimelineModel(flyoutPreview.timelineModel);
    setRetentionPeriod(flyoutPreview.retentionPeriod);
    setDataPhasesCount(flyoutPreview.dataPhasesCount);
    setDownsampleStepsCount(flyoutPreview.downsampleStepsCount);
  }, [
    clearPreview,
    definition.stream.ingest.lifecycle,
    flyoutPreview,
    isOpen,
    nextLifecycle,
    setDataPhasesCount,
    setDownsampleStepsCount,
    setHasUnsavedChanges,
    setIsActive,
    setRetentionPeriod,
    setTimelineModel,
    updateInProgress,
  ]);

  useEffect(() => {
    if (isOpen) return;
    if (!isOtherFlyoutOpen) {
      clearPreview();
    }
  }, [clearPreview, isOtherFlyoutOpen, isOpen]);

  const previewHeader = useMemo(() => {
    if (inheritLifecycle) {
      const ilmPolicyName =
        inheritedEffectiveLifecycle && isIlmLifecycle(inheritedEffectiveLifecycle)
          ? inheritedEffectiveLifecycle.ilm.policy
          : undefined;
      const inheritedMethod: 'dlm' | 'ilm' = ilmPolicyName ? 'ilm' : 'dlm';
      return {
        inheritLifecycle: true,
        method: inheritedMethod,
        ilmPolicyName,
        canShowInheritBadge: canShowInherit,
      };
    }

    const previewIlmPolicyName =
      method === 'ilm' &&
      inspectedIlmPolicyName &&
      selectedIlmPolicyName === selectedPolicyNameAtInspectRef.current
        ? inspectedIlmPolicyName
        : selectedIlmPolicyName;

    return {
      inheritLifecycle,
      method: method as 'dlm' | 'ilm',
      ilmPolicyName: previewIlmPolicyName,
      canShowInheritBadge: canShowInherit,
    };
  }, [
    canShowInherit,
    inheritLifecycle,
    inheritedEffectiveLifecycle,
    inspectedIlmPolicyName,
    method,
    selectedIlmPolicyName,
  ]);

  const inspectFlyout = useMemo(() => {
    if (!isOpen || !inspectedIlmPolicyName) {
      return null;
    }

    const inspected = ilmPolicies.find((p) => p.name === inspectedIlmPolicyName);
    if (!inspected?.serializedPolicy) {
      return null;
    }

    return (
      <InspectIlmPolicyFlyout
        policyName={inspectedIlmPolicyName}
        policy={inspected.serializedPolicy}
        onBack={closeInspectFlyout}
        onEditPolicy={(policyToEdit) =>
          application.navigateToApp('management', {
            path: `data/index_lifecycle_management/policies/edit/${encodeURIComponent(
              policyToEdit
            )}`,
            openInNewTab: true,
          })
        }
        primaryAction={{
          label: i18n.translate(
            'xpack.streams.editSuccessfulLifecycle.inspectIlmPolicy.primaryActionApplyLabel',
            { defaultMessage: 'Apply' }
          ),
          onClick: async (policyToApply) => {
            closeInspectFlyout();
            // Only sync local selection state after the update succeeds, so a
            // failed save can't leave the flyout showing a policy that was never
            // persisted.
            const succeeded = await updateLifecycle({ ilm: { policy: policyToApply } });
            if (succeeded) {
              setInheritLifecycle(false);
              setMethod('ilm');
              setSelectedIlmPolicyName(policyToApply);
            }
          },
          'data-test-subj': 'inspectIlmPolicyFlyoutSelectAndApplyButton',
          isDisabled: updateInProgress,
        }}
        type="push"
        container={getLifecycleFlyoutContainer()}
        ownFocus={false}
      />
    );
  }, [
    application,
    closeInspectFlyout,
    ilmPolicies,
    inspectedIlmPolicyName,
    isOpen,
    updateInProgress,
    updateLifecycle,
  ]);

  const flyout = !isOpen ? null : (
    <>
      <LifecycleFlyout
        onClose={closeFlyout}
        ownFocus={false}
        paddingSize="none"
        data-test-subj="streamsEditSuccessfulDataLifecycleFlyout"
        titleId={titleId}
        title={i18n.translate('xpack.streams.editSuccessfulLifecycle.title', {
          defaultMessage: 'Edit successful data lifecycle',
        })}
      >
        <EditDataLifecycleFlyoutBody
          inherit={
            canShowInherit
              ? {
                  value: inheritLifecycle,
                  onChange: onChangeInheritLifecycle,
                  label: inheritLabel,
                  link: inheritLink,
                }
              : undefined
          }
          method={
            isServerless
              ? undefined
              : {
                  value: method,
                  onChange: setMethod,
                }
          }
          ilm={
            isServerless
              ? undefined
              : {
                  policies: isLoadingIlmPolicies ? [] : ilmPolicies,
                  selectedPolicyName: selectedIlmPolicyName,
                  onSelect: setSelectedIlmPolicyName,
                  onInspect: openInspectPolicy,
                }
          }
        />

        <FlyoutFooterWithRetentionWarning
          onCancel={closeFlyout}
          onApply={() => {
            if (!nextLifecycle) return;
            // Re-inheriting does not override the index template, so it never
            // needs confirmation.
            if (inheritLifecycle) {
              updateLifecycle(nextLifecycle);
              return;
            }
            confirmOverride(() => updateLifecycle(nextLifecycle), { targetMethod: method });
          }}
          isApplyDisabled={isApplyDisabled}
          showWarning={retentionWarning}
        />
      </LifecycleFlyout>

      {inspectFlyout}
      {overrideModal}
    </>
  );

  return {
    isOpen,
    titleId,
    openFlyout,
    closeFlyout,
    flyout,
    previewHeader,
  };
};
