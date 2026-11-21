/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFieldSearch,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { getHttpErrorMessage } from '../../../hooks/errors';
import { ICONS } from '../../../icons';
import { formatAbsoluteUtc } from '../../shared/formatters';
import type { AlertChoice } from '../evidence_api';
import { useAlertSearch } from '../use_evidence_queries';
import { AddFormLayout } from './add_form_layout';
import type { AddFormProps } from './add_form_layout';
import { SharedFields } from './common_fields';
import { toEvidenceInput, useCreateEvidence } from './use_create_evidence';
import { useSharedFields } from './use_shared_fields';
import * as i18n from '../translations';

const FORM_ID = 'investigationEvidenceAddAlert';
const SEARCH_DEBOUNCE_MS = 300;
/** Attaching more alerts than this skips indicator extraction to keep the request quick. */
const EXTRACT_INDICATORS_LIMIT = 25;

const toIsoOrNull = (timestamp: string | null): string | null => {
  if (!timestamp) return null;
  return Number.isNaN(Date.parse(timestamp)) ? null : new Date(timestamp).toISOString();
};

export const AlertForm: React.FC<AddFormProps> = ({ recordId, onDone, onBack }) => {
  const { euiTheme } = useEuiTheme();
  const shared = useSharedFields(recordId);
  const { create, isLoading: isSaving } = useCreateEvidence(recordId);
  const [searchText, setSearchText] = useState('');
  const [debouncedText, setDebouncedText] = useState('');
  const [selected, setSelected] = useState<Map<string, AlertChoice>>(new Map());
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(searchText), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: alerts, isLoading, isFetching, error } = useAlertSearch(debouncedText);

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      (alerts ?? []).map((alert) => ({
        key: alert.id,
        label: alert.ruleName,
        checked: selected.has(alert.id) ? 'on' : undefined,
        append: (
          <EuiText size="xs" color="subdued">
            {[
              alert.host,
              alert.severity,
              alert.timestamp ? formatAbsoluteUtc(alert.timestamp) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </EuiText>
        ),
        'data-test-subj': `investigationEvidenceAddAlertOption-${alert.id}`,
      })),
    [alerts, selected]
  );

  const submit = async () => {
    setShowErrors(true);
    if (selected.size === 0) {
      return;
    }
    const choices = Array.from(selected.values());
    try {
      await create({
        claim: shared.claim,
        extractIndicators: choices.length <= EXTRACT_INDICATORS_LIMIT ? undefined : false,
        inputs: choices.map((alert) =>
          toEvidenceInput(alert.ruleName, {
            type: 'alert',
            why: shared.trimmedWhy,
            source: { label: i18n.SOURCE_ALERT, kind: 'alert', index: alert.index, id: alert.id },
            alert: {
              id: alert.id,
              index: alert.index,
              rule_id: alert.ruleId,
              rule_name: alert.ruleName,
              severity: alert.severity || null,
              risk_score: alert.riskScore,
              host: alert.host,
              user: alert.user,
              timestamp: toIsoOrNull(alert.timestamp),
            },
            snapshot: {
              kind: 'alert',
              severity: alert.severity,
              risk_score: alert.riskScore ?? 0,
              timestamp: alert.timestamp ?? '',
              rule: alert.ruleName,
              description: alert.description,
              reason: alert.reason,
              mitre: [],
              fields: alert.fields,
            },
          })
        ),
      });
      onDone();
    } catch {
      // The mutation already showed the error.
    }
  };

  return (
    <AddFormLayout
      formId={FORM_ID}
      onBack={onBack}
      onSubmit={() => void submit()}
      isLoading={isSaving}
      submitLabel={selected.size > 1 ? i18n.ADD_ALERTS(selected.size) : i18n.ADD_EVIDENCE}
    >
      <EuiFormRow
        label={i18n.ALERT_LABEL}
        helpText={i18n.ALERT_HELP}
        isInvalid={showErrors && selected.size === 0}
        error={i18n.ALERT_CHOOSE}
        fullWidth
      >
        <EuiFieldSearch
          fullWidth
          value={searchText}
          isLoading={isFetching}
          placeholder={i18n.ALERT_SEARCH_PLACEHOLDER}
          aria-label={i18n.ALERT_SEARCH_LABEL}
          incremental={false}
          maxLength={256}
          onChange={(event) => setSearchText(event.target.value)}
          data-test-subj="investigationEvidenceAddAlertSearch"
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      {isLoading ? (
        <EuiLoadingSpinner size="l" />
      ) : error ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType={ICONS.error}
          size="s"
          title={i18n.ALERT_LOAD_ERROR}
          data-test-subj="investigationEvidenceAddAlertError"
          text={getHttpErrorMessage(error)}
        />
      ) : (alerts ?? []).length === 0 ? (
        <EuiCallOut
          announceOnMount
          size="s"
          iconType={ICONS.info}
          title={i18n.ALERT_NONE}
          data-test-subj="investigationEvidenceAddAlertEmpty"
        />
      ) : (
        <EuiSelectable
          aria-label={i18n.ALERT_LABEL}
          options={options}
          listProps={{ onFocusBadge: false, rowHeight: euiTheme.base * 2.25 }}
          height={220}
          onChange={(changed) => {
            const next = new Map(selected);
            (alerts ?? []).forEach((alert) => {
              const option = changed.find(({ key }) => key === alert.id);
              if (option?.checked === 'on') next.set(alert.id, alert);
              else next.delete(alert.id);
            });
            setSelected(next);
          }}
          css={css`
            border: ${euiTheme.border.thin};
            border-radius: ${euiTheme.border.radius.medium};
          `}
          data-test-subj="investigationEvidenceAddAlertList"
        >
          {(list) => list}
        </EuiSelectable>
      )}
      {selected.size > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiBadge color="hollow" data-test-subj="investigationEvidenceAddAlertSelected">
            {i18n.ALERTS_SELECTED(selected.size)}
          </EuiBadge>
        </>
      ) : null}
      <SharedFields
        value={shared.why}
        onChange={shared.setWhy}
        claims={shared.claims}
        claimId={shared.claimId}
        onClaimChange={shared.setClaimId}
      />
    </AddFormLayout>
  );
};
AlertForm.displayName = 'AlertForm';
