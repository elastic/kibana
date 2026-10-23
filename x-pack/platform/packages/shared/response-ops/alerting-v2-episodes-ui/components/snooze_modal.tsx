/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { QueryClient } from '@kbn/react-query';
import { QueryClientProvider } from '@kbn/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  PANEL_TITLE,
  QUICK_SNOOZE_POPOVER_APPLY,
  QUICK_SNOOZE_POPOVER_SUBTITLE,
  SnoozeFormBody,
  useSnoozeForm,
  type AlertSnoozePayload,
} from '@kbn/response-ops-alert-snooze';
import type { SnoozeCondition } from '@kbn/response-ops-alerts-apis/types';
import {
  useConditionFieldNames,
  type ConditionFieldsSource,
} from '../hooks/use_condition_field_names';
import * as i18n from '../actions/translations';

/**
 * What the snooze modal resolves with: an expiry (`null` for indefinite) plus the
 * optional conditions that lift the snooze before it expires.
 */
export interface EpisodeSnoozePayload {
  snoozedUntil: string | null;
  conditions?: SnoozeCondition[];
  conditionOperator?: 'any' | 'all';
}

export interface SnoozeModalDeps {
  http: HttpStart;
  overlays: OverlayStart;
  rendering: CoreStart['rendering'];
  queryClient: QueryClient;
}

export interface SnoozeModalOptions {
  /** Source backing the `field_change` condition dropdown. */
  dataSource?: ConditionFieldsSource;
  /**
   * Rule types of the rows being snoozed, so the `field_change` dropdown only
   * offers fields those alerts actually have.
   */
  ruleTypeIds?: string[];
  /**
   * Why the condition-based tab cannot be used for the current selection, which
   * renders it disabled with the reason as its tooltip.
   */
  conditionalTabDisabledReason?: string;
}

interface SnoozeModalProps extends SnoozeModalOptions {
  http: HttpStart;
  onConfirm: (payload: EpisodeSnoozePayload) => void;
  onCancel: () => void;
}

const toSnoozePayload = ({
  expiresAt,
  conditions,
  conditionOperator,
}: AlertSnoozePayload): EpisodeSnoozePayload => ({
  snoozedUntil: expiresAt ?? null,
  // The panel's condition type is open ended so consumers can register their own
  // descriptors; only the built-in ones are wired here, and they match the API shape.
  ...(conditions?.length ? { conditions: conditions as SnoozeCondition[], conditionOperator } : {}),
});

const SnoozeModal = ({
  http,
  dataSource,
  ruleTypeIds,
  conditionalTabDisabledReason,
  onConfirm,
  onCancel,
}: SnoozeModalProps) => {
  const {
    activeTab,
    setActiveTab,
    setQuickEndDate,
    setConditionalSchedule,
    isApplyDisabled,
    applySnooze,
  } = useSnoozeForm((payload) => onConfirm(toSnoozePayload(payload)));

  const { fieldNames, isLoading } = useConditionFieldNames({
    http,
    dataSource,
    ruleTypeIds,
    enabled: conditionalTabDisabledReason == null,
  });

  return (
    <EuiModal onClose={onCancel} aria-labelledby="snoozeModalTitle" data-test-subj="snoozeModal">
      <EuiModalHeader>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="bellSlash" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiModalHeaderTitle id="snoozeModalTitle">{PANEL_TITLE}</EuiModalHeaderTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="xs" color="subdued">
          <p>{QUICK_SNOOZE_POPOVER_SUBTITLE}</p>
        </EuiText>
        <EuiHorizontalRule margin="m" />
        <EuiSpacer size="xs" />
        <SnoozeFormBody
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onQuickScheduleChange={setQuickEndDate}
          onConditionalScheduleChange={setConditionalSchedule}
          fieldOptions={fieldNames}
          isLoadingFields={isLoading}
          conditionalTabDisabledReason={conditionalTabDisabledReason}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="snoozeModalCancel" onClick={onCancel}>
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="snoozeModalConfirm"
          onClick={() => applySnooze()}
          isDisabled={isApplyDisabled}
          fill
        >
          {QUICK_SNOOZE_POPOVER_APPLY}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

/** Resolves with the snooze to apply, or `undefined` when the user cancels. */
export const openSnoozeModal = (
  deps: SnoozeModalDeps,
  options: SnoozeModalOptions = {}
): Promise<EpisodeSnoozePayload | undefined> => {
  return new Promise<EpisodeSnoozePayload | undefined>((resolve) => {
    const ref = deps.overlays.openModal(
      toMountPoint(
        // `overlays.openModal` mounts in a separate React root, so the page-level
        // `QueryClientProvider` is out of scope here. Re-wrap with the same client
        // so the condition field lookup shares the page's cache.
        <QueryClientProvider client={deps.queryClient}>
          <SnoozeModal
            http={deps.http}
            dataSource={options.dataSource}
            ruleTypeIds={options.ruleTypeIds}
            conditionalTabDisabledReason={options.conditionalTabDisabledReason}
            onConfirm={(payload) => {
              ref.close();
              resolve(payload);
            }}
            onCancel={() => {
              ref.close();
              resolve(undefined);
            }}
          />
        </QueryClientProvider>,
        deps.rendering
      )
    );
  });
};
