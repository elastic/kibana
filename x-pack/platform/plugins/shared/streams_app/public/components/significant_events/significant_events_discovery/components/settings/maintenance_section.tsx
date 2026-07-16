/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiCallOut, EuiConfirmModal, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SignificantEventsMaintenanceStatus } from '@kbn/significant-events-plugin/common';
import {
  useMaintenanceStatus,
  useSignificantEventsMaintenanceActions,
} from '../../../../../hooks/significant_events/use_significant_events_maintenance';

const SECTION_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.settings.maintenance.title',
  { defaultMessage: 'Background activity' }
);

const SECTION_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.settings.maintenance.description',
  {
    defaultMessage:
      'Pause all automated Significant Events activity across the entire deployment (every Kibana space), not only this space: scheduled discovery, continuous onboarding, detections, memory, investigations, and the alerting rules backing knowledge indicator queries. Existing data is kept. Resume re-enables everything Pause turned off.',
  }
);

function PausedCallout({ status }: { status: SignificantEventsMaintenanceStatus }) {
  const { updatedBy, lastSummary } = status;
  const workflowsDisabled = lastSummary?.workflowsDisabled ?? 0;
  const rulesDisabled = lastSummary?.rulesDisabled ?? 0;
  const executionsCancelled = lastSummary?.executionsCancelled ?? 0;
  const failureCount = lastSummary?.partialFailures.length ?? 0;
  const hasCounts = workflowsDisabled > 0 || rulesDisabled > 0 || executionsCancelled > 0;
  return (
    <EuiCallOut
      announceOnMount
      size="s"
      color="warning"
      iconType="pause"
      data-test-subj="streams-settings-maintenance-paused-status"
      title={i18n.translate(
        'xpack.streams.significantEventsDiscovery.settings.maintenance.pausedTitle',
        { defaultMessage: 'Background activity is paused' }
      )}
    >
      {updatedBy && (
        <p>
          <FormattedMessage
            id="xpack.streams.significantEventsDiscovery.settings.maintenance.pausedBy"
            defaultMessage="Paused by {pausedBy}."
            values={{ pausedBy: <strong>{updatedBy}</strong> }}
          />
        </p>
      )}
      {hasCounts && (
        <p>
          <FormattedMessage
            id="xpack.streams.significantEventsDiscovery.settings.maintenance.pausedSummary"
            defaultMessage="Disabled {workflowsDisabled} workflow(s) and {rulesDisabled} rule(s), cancelled {executionsCancelled} in-flight execution(s)."
            values={{ workflowsDisabled, rulesDisabled, executionsCancelled }}
          />
        </p>
      )}
      {failureCount > 0 && (
        <p data-test-subj="streams-settings-maintenance-partial-failures">
          <FormattedMessage
            id="xpack.streams.significantEventsDiscovery.settings.maintenance.partialFailures"
            defaultMessage="{failureCount, plural, one {# operation} other {# operations}} could not be completed. Check the Kibana server logs for details."
            values={{ failureCount }}
          />
        </p>
      )}
    </EuiCallOut>
  );
}

export function MaintenanceSection({ canManage }: { canManage: boolean }) {
  const { data: status, isLoading } = useMaintenanceStatus();
  const { pause, resume, isPausing, isResuming } = useSignificantEventsMaintenanceActions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const paused = status?.state === 'paused';
  const isMutating = isPausing || isResuming;

  const onConfirm = () => {
    setIsModalOpen(false);
    if (paused) {
      resume();
    } else {
      pause();
    }
  };

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>{SECTION_TITLE}</h3>
        </EuiText>
      </EuiPanel>
      <EuiPanel hasShadow={false} hasBorder={false}>
        <EuiText size="s">
          <p>{SECTION_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer />
        {paused && status && (
          <>
            <PausedCallout status={status} />
            <EuiSpacer />
          </>
        )}
        <EuiButton
          data-test-subj="streams-settings-maintenance-toggle-button"
          color={paused ? 'primary' : 'warning'}
          iconType={paused ? 'play' : 'pause'}
          isLoading={isMutating}
          isDisabled={!canManage || isLoading || isMutating}
          onClick={() => setIsModalOpen(true)}
        >
          {paused
            ? i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.maintenance.resumeButton',
                { defaultMessage: 'Resume background activity' }
              )
            : i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.maintenance.pauseButton',
                { defaultMessage: 'Pause background activity' }
              )}
        </EuiButton>
      </EuiPanel>

      {isModalOpen && (
        <EuiConfirmModal
          data-test-subj="streams-settings-maintenance-confirm-modal"
          aria-label={i18n.translate(
            'xpack.streams.significantEventsDiscovery.settings.maintenance.confirmAriaLabel',
            { defaultMessage: 'Confirm Significant Events background activity change' }
          )}
          title={
            paused
              ? i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.maintenance.resumeConfirmTitle',
                  { defaultMessage: 'Resume background activity?' }
                )
              : i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.maintenance.pauseConfirmTitle',
                  { defaultMessage: 'Pause background activity?' }
                )
          }
          onCancel={() => setIsModalOpen(false)}
          onConfirm={onConfirm}
          cancelButtonText={i18n.translate(
            'xpack.streams.significantEventsDiscovery.settings.maintenance.confirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={
            paused
              ? i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.maintenance.resumeConfirmButton',
                  { defaultMessage: 'Resume' }
                )
              : i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.maintenance.pauseConfirmButton',
                  { defaultMessage: 'Pause' }
                )
          }
          buttonColor={paused ? 'primary' : 'warning'}
          defaultFocusedButton="confirm"
        >
          <p>
            {paused
              ? i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.maintenance.resumeConfirmBody',
                  {
                    defaultMessage:
                      'This re-enables the managed workflows and alerting rules that Pause disabled. It does not restart executions that were cancelled.',
                  }
                )
              : i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.maintenance.pauseConfirmBody',
                  {
                    defaultMessage:
                      'This disables all Significant Events managed workflows, cancels their in-flight executions, and disables the alerting rules backing knowledge indicator queries. No data is deleted.',
                  }
                )}
          </p>
        </EuiConfirmModal>
      )}
    </EuiPanel>
  );
}
