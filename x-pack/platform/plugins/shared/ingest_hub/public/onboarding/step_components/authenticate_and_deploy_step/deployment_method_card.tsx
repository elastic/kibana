/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiCheckableCard,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

import type { AwsServiceMatrixEntry, DeploymentMethod } from '../../aws_service_matrix';

// Re-export the canonical type from the matrix so all consumers use the same spelling.
export type { DeploymentMethod };

interface DeploymentMethodOption {
  value: DeploymentMethod;
  /** Bold name shown on the card */
  name: string;
  /** One line of help shown under the name */
  description: string;
  isRecommended?: boolean;
}

const DEPLOYMENT_METHOD_OPTIONS: DeploymentMethodOption[] = [
  {
    value: 'managed_integration',
    name: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.deploymentMethod.managedIntegrations.name',
      { defaultMessage: 'Elastic Managed Integration' }
    ),
    description: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.deploymentMethod.managedIntegrations.description',
      { defaultMessage: 'Best for simple setup.' }
    ),
    isRecommended: true,
  },
  {
    value: 'agent_based',
    name: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.deploymentMethod.agentBased.name',
      { defaultMessage: 'Agent-based' }
    ),
    description: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.deploymentMethod.agentBased.description',
      { defaultMessage: 'Best if you need more control.' }
    ),
  },
];

interface DeploymentMethodCardProps {
  selectedMethod: DeploymentMethod;
  onChange: (method: DeploymentMethod) => void;
  /** When true, the choice is fixed and the cards are not selectable (e.g. agent-based-only services selected). */
  locked?: boolean;
  /** When true, the cards are disabled with a tooltip — deployment method is locked after the first deploy. */
  disabled?: boolean;
  /**
   * Methods offered as cards. Omitted means all of them; self-managed passes
   * `['agent_based']` because the agentless infrastructure the other methods need is cloud-only.
   */
  availableMethods?: DeploymentMethod[];
  /** Selected services that choosing a method would remove from the selection. */
  unsupportedServices?: Partial<Record<DeploymentMethod, AwsServiceMatrixEntry[]>>;
}

export function DeploymentMethodCard({
  selectedMethod,
  onChange,
  locked = false,
  disabled = false,
  availableMethods,
  unsupportedServices,
}: DeploymentMethodCardProps) {
  const radioGroupName = useGeneratedHtmlId({ prefix: 'deploymentMethod' });
  const confirmModalTitleId = useGeneratedHtmlId();
  const [pendingMethod, setPendingMethod] = useState<DeploymentMethod | null>(null);

  const options = availableMethods
    ? DEPLOYMENT_METHOD_OPTIONS.filter((o) => availableMethods.includes(o.value))
    : DEPLOYMENT_METHOD_OPTIONS;

  // Defensive fallback: if a stale/hand-edited session-storage value carries an unknown method,
  // check the first option rather than leaving every card unchecked. The type permits any
  // DeploymentMethod string. The second fallback covers an availableMethods list that filters
  // everything out.
  const selectedOption =
    options.find((o) => o.value === selectedMethod) ?? options[0] ?? DEPLOYMENT_METHOD_OPTIONS[0];

  const cardsDisabled = locked || disabled;

  const handleSelect = (method: DeploymentMethod) => {
    if (cardsDisabled || method === selectedOption.value) return;
    // Ask before dropping services from the selection; apply anything else straight away.
    if ((unsupportedServices?.[method] ?? []).length > 0) {
      setPendingMethod(method);
      return;
    }
    onChange(method);
  };

  const removedServiceNames = pendingMethod
    ? (unsupportedServices?.[pendingMethod] ?? []).map((s) => s.name)
    : [];

  const cards = (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap>
      {options.map((option) => (
        <EuiFlexItem key={option.value} style={{ minWidth: 280 }}>
          <EuiCheckableCard
            id={`${radioGroupName}-${option.value}`}
            name={radioGroupName}
            checkableType="radio"
            value={option.value}
            checked={option.value === selectedOption.value}
            onChange={() => handleSelect(option.value)}
            disabled={cardsDisabled}
            data-test-subj={`deploymentMethodCard-${option.value}`}
            label={
              <>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <strong>{option.name}</strong>
                  </EuiFlexItem>
                  {option.isRecommended && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        <FormattedMessage
                          id="xpack.ingestHub.authenticateAndDeployStep.deploymentMethod.recommended"
                          defaultMessage="Recommended"
                        />
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                <EuiText size="s" color="subdued">
                  {option.description}
                </EuiText>
              </>
            }
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

  return (
    <section data-test-subj="deploymentMethodCard">
      <EuiTitle size="m">
        <h2>
          <FormattedMessage
            id="xpack.ingestHub.authenticateAndDeployStep.deploymentMethodCard.title"
            defaultMessage="Deployment method"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {/* span needed: disabled cards have pointer-events:none; the span intercepts hover and
          keyboard focus (tabIndex) so the tooltip fires for mouse and keyboard users. Only shown
          for the post-deploy lock; a forced method has nothing to explain here. */}
      {disabled && !locked ? (
        <EuiToolTip
          display="block"
          content={i18n.translate(
            'xpack.ingestHub.authenticateAndDeployStep.deploymentMethodCard.disabledTooltip',
            {
              defaultMessage:
                'Deployment method cannot be changed after services have been deployed. Start a new session to choose a different method.',
            }
          )}
        >
          <span tabIndex={0} style={{ display: 'block' }}>
            {cards}
          </span>
        </EuiToolTip>
      ) : (
        cards
      )}

      {pendingMethod && (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          titleProps={{ id: confirmModalTitleId }}
          title={i18n.translate(
            'xpack.ingestHub.authenticateAndDeployStep.confirmDeploymentMethodModal.title',
            { defaultMessage: 'Change deployment method?' }
          )}
          onCancel={() => setPendingMethod(null)}
          onConfirm={() => {
            onChange(pendingMethod);
            setPendingMethod(null);
          }}
          cancelButtonText={i18n.translate(
            'xpack.ingestHub.authenticateAndDeployStep.confirmDeploymentMethodModal.cancelButton',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.ingestHub.authenticateAndDeployStep.confirmDeploymentMethodModal.confirmButton',
            { defaultMessage: 'Change method' }
          )}
          data-test-subj="confirmDeploymentMethodModal"
        >
          <KbnWarningCallout
            announceOnMount
            title={i18n.translate(
              'xpack.ingestHub.authenticateAndDeployStep.confirmDeploymentMethodModal.removedServicesCallout.title',
              { defaultMessage: 'Services will be removed' }
            )}
            text={
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.confirmDeploymentMethodModal.removedServicesCallout.body"
                  defaultMessage="{services} can't be deployed by this method. Changing the method removes {count, plural, one {it} other {them}} from your selection."
                  values={{
                    services: <strong>{removedServiceNames.join(', ')}</strong>,
                    count: removedServiceNames.length,
                  }}
                />
              </p>
            }
            data-test-subj="confirmDeploymentMethodModal-removedServicesCallout"
          />
        </EuiConfirmModal>
      )}
    </section>
  );
}
