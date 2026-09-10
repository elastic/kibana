/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextArea,
  EuiSpacer,
  EuiBadge,
  EuiBasicTable,
  EuiLink,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HttpSetup } from '@kbn/core/public';
import type { CustomRule } from './types';
import { usePreview } from './use_anonymization_settings';

// ---------------------------------------------------------------------------
// Entity class options
// ---------------------------------------------------------------------------

export const ENTITY_CLASS_OPTIONS = [
  { value: 'EMAIL', text: 'EMAIL' },
  { value: 'IP', text: 'IP' },
  { value: 'HOST_NAME', text: 'HOST_NAME' },
  { value: 'USER_NAME', text: 'USER_NAME' },
  { value: 'URL', text: 'URL' },
  { value: 'CLOUD_ACCOUNT', text: 'CLOUD_ACCOUNT' },
  { value: 'ENTITY_NAME', text: 'ENTITY_NAME' },
  { value: 'RESOURCE_NAME', text: 'RESOURCE_NAME' },
  { value: 'RESOURCE_ID', text: 'RESOURCE_ID' },
];

const PATTERN_PLACEHOLDER_BY_CLASS: Record<string, string> = {
  EMAIL: String.raw`[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}`,
  IP: String.raw`\b\d{1,3}(?:\.\d{1,3}){3}\b`,
  HOST_NAME: String.raw`[a-z0-9\-]+(?:\.[a-z0-9\-]+)+`,
  USER_NAME: String.raw`[a-z][a-z0-9_\-]{2,19}`,
  URL: String.raw`https?://\S+`,
  CLOUD_ACCOUNT: String.raw`\d{12}`,
  ENTITY_NAME: String.raw`[A-Z][a-z]+ [A-Z][a-z]+`,
  RESOURCE_NAME: String.raw`[a-z][a-z0-9\-]{2,63}`,
  RESOURCE_ID: String.raw`EMP-\d{6}`,
};

// ---------------------------------------------------------------------------
// Sample text defaults per entity class
// ---------------------------------------------------------------------------

const SAMPLE_TEXT_BY_CLASS: Record<string, string> = {
  EMAIL:
    'Please contact john.doe@example.com or support@company.org for further assistance. The ticket was escalated to alice@internal.corp.',
  IP: 'The server at 192.168.1.10 was accessed from 10.0.0.1 and 172.16.0.5. Alert triggered from 203.0.113.42.',
  HOST_NAME:
    'Connect to api.example.com or db.internal.company.org. The backup job ran on backup-node-01.prod.local.',
  USER_NAME:
    'Login as username: jdoe or account: admin to access the portal. User login: svc_deploy initiated the deployment.',
  URL: 'Visit https://elastic.co or https://kibana.example.com/app/discover for documentation.',
  CLOUD_ACCOUNT:
    'Access from account 123456789012 in region us-east-1. The role arn:aws:iam::987654321000:role/ops-admin was assumed.',
  ENTITY_NAME:
    'The ticket was assigned to John Smith from the Acme Corporation team. Sarah Johnson approved the change.',
  RESOURCE_NAME:
    'The index kibana-sample-data-logs was queried by fleet-server. Policy logs-default-policy applied.',
  RESOURCE_ID:
    'Escalation from EMP-204417 (badge EMP-889201).\nOpened CASE-EU-4417 after a.mehta@example.com reported lockouts on web-prod-eu-04.\nDuplicate report filed by EMP-204417.',
};

const DEFAULT_SAMPLE = 'Enter some sample text to test your pattern against.';

// ---------------------------------------------------------------------------
// Highlighted text renderer — driven by server-returned tokenMap
// ---------------------------------------------------------------------------

interface HighlightSpan {
  start: number;
  end: number;
  value: string;
}

/**
 * Builds non-overlapping highlight spans from the original text and the
 * server's tokenMap (token → originalValue). Longer values take priority
 * so nested matches don't produce overlapping highlights.
 */
const buildSpans = (text: string, tokenMap: Record<string, string>): HighlightSpan[] => {
  const values = Object.values(tokenMap).sort((a, b) => b.length - a.length);
  const spans: HighlightSpan[] = [];
  for (const value of values) {
    let idx = 0;
    while ((idx = text.indexOf(value, idx)) !== -1) {
      const end = idx + value.length;
      if (!spans.some((s) => idx < s.end && end > s.start)) {
        spans.push({ start: idx, end, value });
      }
      idx = end;
    }
  }
  return spans.sort((a, b) => a.start - b.start);
};

const HighlightedText: React.FC<{ text: string; spans: HighlightSpan[] }> = ({ text, spans }) => {
  if (spans.length === 0) return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  const parts: React.ReactNode[] = [];
  let pos = 0;
  for (const span of spans) {
    if (span.start > pos) parts.push(<span key={`t-${pos}`}>{text.slice(pos, span.start)}</span>);
    parts.push(
      <mark
        key={`m-${span.start}`}
        style={{ background: 'rgba(0,179,255,0.25)', color: 'inherit', borderRadius: 2, padding: '0 2px' }}
      >
        {span.value}
      </mark>
    );
    pos = span.end;
  }
  if (pos < text.length) parts.push(<span key="t-end">{text.slice(pos)}</span>);
  return <span style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{parts}</span>;
};

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

export interface RuleFormState {
  name: string;
  entityClass: string;
  pattern: string;
  enabled: boolean;
}

export const EMPTY_FORM: RuleFormState = {
  name: '',
  entityClass: 'RESOURCE_ID',
  pattern: '',
  enabled: true,
};

// ---------------------------------------------------------------------------
// Modal component
// ---------------------------------------------------------------------------

interface CustomPatternModalProps {
  http: HttpSetup;
  editingRule: CustomRule | null;
  onSave: (rule: Omit<CustomRule, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

export const CustomPatternModal: React.FC<CustomPatternModalProps> = ({
  http,
  editingRule,
  onSave,
  onClose,
}) => {
  const initial: RuleFormState = editingRule
    ? { name: editingRule.name, entityClass: editingRule.entityClass, pattern: editingRule.pattern, enabled: editingRule.enabled }
    : EMPTY_FORM;

  const [form, setForm] = useState<RuleFormState>(initial);
  const [patternError, setPatternError] = useState<string | null>(null);
  const [sampleText, setSampleText] = useState(
    SAMPLE_TEXT_BY_CLASS[initial.entityClass] ?? DEFAULT_SAMPLE
  );
  const [previewResult, setPreviewResult] = useState<{
    tokenized: string;
    tokenMap: Record<string, string>;
  } | null>(null);

  const { mutate: runPreview, isLoading: isTesting } = usePreview(http);

  const validatePattern = (p: string): string | null => {
    if (!p.trim())
      return i18n.translate('xpack.inferenceWorkflows.anonymization.modal.patternRequired', {
        defaultMessage: 'Pattern is required',
      });
    try {
      // eslint-disable-next-line no-new
      new RegExp(p);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  };

  const handlePatternChange = (val: string) => {
    setForm((f) => ({ ...f, pattern: val }));
    setPatternError(null);
    setPreviewResult(null);
  };

  const handleEntityClassChange = (val: string) => {
    setForm((f) => ({ ...f, entityClass: val }));
    setSampleText(SAMPLE_TEXT_BY_CLASS[val] ?? DEFAULT_SAMPLE);
    setPreviewResult(null);
  };

  const handleSampleTextChange = (val: string) => {
    setSampleText(val);
    setPreviewResult(null);
  };

  const handleTest = useCallback(() => {
    const err = validatePattern(form.pattern);
    if (err) { setPatternError(err); return; }
    runPreview(
      {
        text: sampleText,
        builtInRules: [],
        customRules: [{ id: 'preview', name: 'preview', entityClass: form.entityClass, pattern: form.pattern, enabled: true }],
      },
      { onSuccess: (result) => setPreviewResult(result) }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, sampleText, runPreview]);

  const handleSave = () => {
    const err = validatePattern(form.pattern);
    if (err) { setPatternError(err); return; }
    if (!form.name.trim()) return;
    onSave({ ...form, ...(editingRule ? { id: editingRule.id } : {}) });
  };

  // Derive highlight spans and match table from the real server result
  const spans = previewResult ? buildSpans(sampleText, previewResult.tokenMap) : [];

  const matchTableItems = previewResult
    ? (() => {
        // tokenMap is { token → originalValue }; build originalValue → token + count
        const valueToToken = new Map<string, string>();
        for (const [token, value] of Object.entries(previewResult.tokenMap)) {
          valueToToken.set(value, token);
        }
        const counts = new Map<string, number>();
        for (const span of spans) counts.set(span.value, (counts.get(span.value) ?? 0) + 1);
        return [...valueToToken.entries()]
          .map(([value, token]) => ({ value, token, occurrences: counts.get(value) ?? 0 }))
          .filter((m) => m.occurrences > 0);
      })()
    : [];

  const canTest = form.pattern.trim() !== '' && patternError === null && sampleText.trim() !== '';

  return (
    <EuiModal onClose={onClose} style={{ width: 560 }} data-test-subj="anonymization-pattern-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {editingRule
            ? <FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.editTitle" defaultMessage="Edit pattern" />
            : <FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.addTitle" defaultMessage="Add pattern" />}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm>
          {/* Name + Entity type side by side */}
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow
                label={<FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.nameLabel" defaultMessage="Name" />}
                helpText={<FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.nameHelp" defaultMessage="Shown in the pattern list and in audit records." />}
              >
                <EuiFieldText
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={i18n.translate('xpack.inferenceWorkflows.anonymization.modal.namePlaceholder', { defaultMessage: 'e.g. Employee ID' })}
                  data-test-subj="anonymization-modal-name"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={<FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.entityClassLabel" defaultMessage="Entity type" />}
                helpText={<FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.entityClassHelp" defaultMessage="Becomes the token prefix, so the model knows the kind of value." />}
              >
                <EuiSelect
                  options={ENTITY_CLASS_OPTIONS}
                  value={form.entityClass}
                  onChange={(e) => handleEntityClassChange(e.target.value)}
                  data-test-subj="anonymization-modal-entity-class"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFormRow
            label={<FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.patternLabel" defaultMessage="Pattern" />}
            helpText={<FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.patternHelp" defaultMessage="A regular expression. Matching is case sensitive." />}
            isInvalid={patternError !== null}
            error={patternError ?? undefined}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued"><code>/</code></EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldText
                  value={form.pattern}
                  onChange={(e) => handlePatternChange(e.target.value)}
                  onBlur={() => setPatternError(validatePattern(form.pattern))}
                  placeholder={PATTERN_PLACEHOLDER_BY_CLASS[form.entityClass] ?? String.raw`[A-Z]{2,}-\d+`}
                  isInvalid={patternError !== null}
                  data-test-subj="anonymization-modal-pattern"
                  style={{ fontFamily: 'monospace' }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued"><code>/g</code></EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>

          <EuiHorizontalRule margin="m" />

          {/* Test section */}
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  <FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.testLabel" defaultMessage="Test against sample text" />
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink
                onClick={() => {
                  setSampleText(SAMPLE_TEXT_BY_CLASS[form.entityClass] ?? DEFAULT_SAMPLE);
                  setPreviewResult(null);
                }}
                data-test-subj="anonymization-modal-insert-example"
              >
                <FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.insertExample" defaultMessage="Insert an example" />
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiTextArea
            fullWidth
            rows={4}
            value={sampleText}
            onChange={(e) => handleSampleTextChange(e.target.value)}
            data-test-subj="anonymization-modal-sample-text"
            aria-label={i18n.translate('xpack.inferenceWorkflows.anonymization.modal.sampleTextLabel', { defaultMessage: 'Sample text' })}
          />
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            isLoading={isTesting}
            disabled={!canTest}
            onClick={handleTest}
            data-test-subj="anonymization-modal-test"
          >
            <FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.testButton" defaultMessage="Test" />
          </EuiButton>

          {previewResult && spans.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiBadge color="primary" data-test-subj="anonymization-modal-match-count">
                {i18n.translate('xpack.inferenceWorkflows.anonymization.modal.matchCount', {
                  defaultMessage: '{total} {total, plural, one {match} other {matches}}, {unique} unique',
                  values: { total: spans.length, unique: matchTableItems.length },
                })}
              </EuiBadge>
              <EuiSpacer size="m" />
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 4,
                  border: '1px solid var(--euiBorderColor, #d3dae6)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                }}
                data-test-subj="anonymization-modal-highlighted-text"
              >
                <HighlightedText text={sampleText} spans={spans} />
              </div>
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.inferenceWorkflows.anonymization.modal.tokenNote"
                  defaultMessage="Repeated values get the same token, so the model can still tell that two mentions are the same thing."
                />
              </EuiText>
              <EuiSpacer size="s" />
              <EuiBasicTable
                tableCaption={i18n.translate('xpack.inferenceWorkflows.anonymization.modal.matchTableCaption', { defaultMessage: 'Matches' })}
                items={matchTableItems}
                columns={[
                  {
                    field: 'value',
                    name: i18n.translate('xpack.inferenceWorkflows.anonymization.modal.matchCol', { defaultMessage: 'Match' }),
                    render: (v: string) => (
                      <EuiBadge
                        color="hollow"
                        style={{ fontFamily: 'monospace', background: 'rgba(0,179,255,0.1)', borderColor: 'rgba(0,179,255,0.4)' }}
                      >
                        {v}
                      </EuiBadge>
                    ),
                  },
                  {
                    field: 'token',
                    name: i18n.translate('xpack.inferenceWorkflows.anonymization.modal.tokenCol', { defaultMessage: 'The model sees' }),
                    render: (v: string) => (
                      <EuiBadge
                        color="hollow"
                        style={{ fontFamily: 'monospace', background: 'rgba(0,179,255,0.05)', borderColor: 'rgba(0,179,255,0.3)', color: '#0096d6' }}
                      >
                        {v}
                      </EuiBadge>
                    ),
                  },
                  {
                    field: 'occurrences',
                    name: i18n.translate('xpack.inferenceWorkflows.anonymization.modal.occurrencesCol', { defaultMessage: 'Occurrences' }),
                    width: '100px',
                    align: 'right' as const,
                  },
                ]}
              />
            </>
          )}

          {previewResult && spans.length === 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.inferenceWorkflows.anonymization.modal.noMatches"
                  defaultMessage="No matches in the sample text. Try adjusting your pattern or sample."
                />
              </EuiText>
            </>
          )}
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="anonymization-modal-cancel">
          <FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.cancel" defaultMessage="Cancel" />
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleSave}
          disabled={!form.name.trim() || !form.pattern.trim()}
          data-test-subj="anonymization-modal-save"
        >
          {editingRule
            ? <FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.saveEdit" defaultMessage="Save changes" />
            : <FormattedMessage id="xpack.inferenceWorkflows.anonymization.modal.saveAdd" defaultMessage="Save pattern" />}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
