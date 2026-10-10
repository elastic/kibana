/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModalBody,
  EuiModalFooter,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EscalationSummary } from '@kbn/agentic-investigations-common';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { ESCALATION_MODAL_TRANSLATIONS } from './escalation_modal_translations';

const T = ESCALATION_MODAL_TRANSLATIONS.addToExistingForm;

export interface AddToExistingEscalationFormProps {
  escalations: EscalationSummary[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmit: (escalationId: string) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export const AddToExistingEscalationForm = memo<AddToExistingEscalationFormProps>(
  ({
    escalations,
    isLoading,
    isError,
    error,
    onRetry,
    searchQuery,
    onSearchChange,
    onSubmit,
    isSubmitting,
    onCancel,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const isRowDisabled = (escalation: EscalationSummary) =>
      escalation.alreadyLinked || !escalation.canManage;

    // Clear the selection whenever the current results no longer include the selected id as a
    // selectable row — covers refetch, retry, or search-driven list changes that didn't go
    // through the search-box onChange handler.
    useEffect(() => {
      if (
        selectedId !== null &&
        !escalations.some((i) => i.id === selectedId && !isRowDisabled(i))
      ) {
        setSelectedId(null);
      }
    }, [escalations, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

    const rowTooltip = (escalation: EscalationSummary) => {
      if (escalation.alreadyLinked) return T.alreadyLinkedTooltip;
      if (!escalation.canManage) return T.notOwnerTooltip;
      return undefined;
    };

    return (
      <>
        <EuiModalBody>
          <EuiFieldSearch
            fullWidth
            placeholder={T.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSelectedId(null);
              onSearchChange(e.target.value);
            }}
            data-test-subj="escalationModalEscalationSearch"
          />

          <EuiSpacer size="m" />

          {isLoading ? (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : isError ? (
            <KbnDangerCallout
              announceOnMount
              title={T.loadErrorTitle}
              data-test-subj="escalationModalLoadError"
              text={error instanceof Error && error.message ? <p>{error.message}</p> : null}
              actionProps={{
                primary: {
                  children: T.retryButton,
                  onClick: onRetry,
                },
              }}
            />
          ) : escalations.length === 0 ? (
            <EuiText size="s" color="subdued" textAlign="center">
              <p>{T.emptyText}</p>
            </EuiText>
          ) : (
            escalations.map((escalation) => (
              <EuiToolTip
                key={escalation.id}
                content={rowTooltip(escalation)}
                position="top"
                display="block"
              >
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  css={css`
                    margin-bottom: ${euiTheme.size.s};
                    ${isRowDisabled(escalation)
                      ? `cursor: not-allowed; opacity: 0.6;`
                      : `cursor: pointer;`}
                    ${selectedId === escalation.id
                      ? `border-color: ${euiTheme.colors.primary};`
                      : ''}
                  `}
                  onClick={() => !isRowDisabled(escalation) && setSelectedId(escalation.id)}
                  data-test-subj={`escalationModalEscalation-${escalation.id}`}
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiRadio
                        id={`escalation-${escalation.id}`}
                        name="escalation-radio"
                        checked={selectedId === escalation.id}
                        disabled={isRowDisabled(escalation)}
                        onChange={() => !isRowDisabled(escalation) && setSelectedId(escalation.id)}
                        aria-label={escalation.title}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{escalation.title}</strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {T.linkedInvestigationsCount(escalation.linkedInvestigationCount)}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="primary">{T.openBadge}</EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiToolTip>
            ))
          )}

          <EuiSpacer size="s" />

          <EuiText size="xs" color="subdued">
            <p>{T.accessNote}</p>
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel} data-test-subj="escalationModalCancel">
            {ESCALATION_MODAL_TRANSLATIONS.cancelButton}
          </EuiButtonEmpty>
          <EuiButton
            fill
            color="primary"
            onClick={() => selectedId && onSubmit(selectedId)}
            isLoading={isSubmitting}
            isDisabled={!selectedId || isSubmitting}
            data-test-subj="escalationModalattachToEscalation"
          >
            {T.submitButton}
          </EuiButton>
        </EuiModalFooter>
      </>
    );
  }
);

AddToExistingEscalationForm.displayName = 'AddToExistingEscalationForm';
