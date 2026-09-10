/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiTabbedContent,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiBasicTable,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiBadge,
  EuiEmptyPrompt,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiSearchBar,
  EuiButtonGroup,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HttpSetup } from '@kbn/core/public';
import type { BuiltInRule, CustomRule } from './types';
import { usePreview } from './use_anonymization_settings';
import { CustomPatternModal } from './custom_pattern_modal';

interface BuiltInMeta {
  description: string;
  example: string;
}

const BUILT_IN_META: Record<string, BuiltInMeta> = {
  IP: {
    description: i18n.translate('xpack.inferenceWorkflows.anonymization.builtIn.ip.desc', {
      defaultMessage: 'IPv4 addresses',
    }),
    example: 'IP_3992ee9f',
  },
  EMAIL: {
    description: i18n.translate('xpack.inferenceWorkflows.anonymization.builtIn.email.desc', {
      defaultMessage: 'Email addresses',
    }),
    example: 'EMAIL_0fd00d86',
  },
  HOST_NAME: {
    description: i18n.translate('xpack.inferenceWorkflows.anonymization.builtIn.hostname.desc', {
      defaultMessage: 'Host and machine names',
    }),
    example: 'HOST_NAME_527e4c32',
  },
  USER_NAME: {
    description: i18n.translate('xpack.inferenceWorkflows.anonymization.builtIn.username.desc', {
      defaultMessage: 'Account and login names',
    }),
    example: 'USER_NAME_d0bc85c9',
  },
};

// ----- Preview tab fixtures and helpers -----

type FixtureId = 'security_alert' | 'esql_result' | 'analyst_question' | 'paste_your_own';

const FIXTURE_SECURITY_ALERT = `{
  "host": { "name": "web-prod-eu-04", "ip": "10.42.7.19" },
  "user": { "name": "CORP\\a.mehta" },
  "source": { "ip": "198.51.100.23" },
  "destination": { "ip": "10.42.8.2" },
  "contact": "a.mehta@example.com",
  "message": "Repeated login failures detected from external IP"
}`;

const FIXTURE_ESQL = `FROM logs-endpoint.events.security-*
| WHERE user.name == "jdoe" AND host.name == "win-workstation-07"
| STATS count = COUNT(*) BY source.ip
| WHERE source.ip IS NOT NULL
| SORT @timestamp DESC | LIMIT 100`;

const FIXTURE_ANALYST = `User alice@corp.example.com reported suspicious activity from 203.0.113.45.
Login history shows connections from 198.51.100.10 on host workstation-12.
Please escalate to sysadmin@corp.example.com.`;

const FIXTURE_TEXTS: Record<FixtureId, string> = {
  security_alert: FIXTURE_SECURITY_ALERT,
  esql_result: FIXTURE_ESQL,
  analyst_question: FIXTURE_ANALYST,
  paste_your_own: '',
};

const FIXTURE_OPTIONS: Array<{ id: string; label: string }> = [
  {
    id: 'security_alert',
    label: i18n.translate(
      'xpack.inferenceWorkflows.anonymization.preview.fixture.securityAlert',
      { defaultMessage: 'Security alert' }
    ),
  },
  {
    id: 'esql_result',
    label: i18n.translate(
      'xpack.inferenceWorkflows.anonymization.preview.fixture.esqlResult',
      { defaultMessage: 'ES|QL tool result' }
    ),
  },
  {
    id: 'analyst_question',
    label: i18n.translate(
      'xpack.inferenceWorkflows.anonymization.preview.fixture.analystQuestion',
      { defaultMessage: 'Analyst question' }
    ),
  },
  {
    id: 'paste_your_own',
    label: i18n.translate(
      'xpack.inferenceWorkflows.anonymization.preview.fixture.pasteYourOwn',
      { defaultMessage: 'Paste your own' }
    ),
  },
];

const buildHighlightSpans = (
  text: string,
  tokenMap: Record<string, string>
): Array<{ text: string; highlighted: boolean }> => {
  const values = [...new Set(Object.values(tokenMap))];
  if (values.length === 0) return [{ text, highlighted: false }];

  const intervals: Array<{ start: number; end: number }> = [];
  for (const value of values) {
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const pos = text.indexOf(value, searchFrom);
      if (pos === -1) break;
      intervals.push({ start: pos, end: pos + value.length });
      searchFrom = pos + value.length;
    }
  }

  intervals.sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  let lastEnd = -1;
  for (const iv of intervals) {
    if (iv.start >= lastEnd) {
      merged.push(iv);
      lastEnd = iv.end;
    }
  }

  const spans: Array<{ text: string; highlighted: boolean }> = [];
  let pos = 0;
  for (const iv of merged) {
    if (iv.start > pos) spans.push({ text: text.slice(pos, iv.start), highlighted: false });
    spans.push({ text: text.slice(iv.start, iv.end), highlighted: true });
    pos = iv.end;
  }
  if (pos < text.length) spans.push({ text: text.slice(pos), highlighted: false });
  return spans;
};

const HighlightedText: React.FC<{
  spans: Array<{ text: string; highlighted: boolean }>;
  highlightColor?: string;
}> = ({ spans, highlightColor = 'rgba(0, 200, 210, 0.25)' }) => (
  <>
    {spans.map((span, i) =>
      span.highlighted ? (
        <mark
          key={i}
          style={{ backgroundColor: highlightColor, borderRadius: 2, padding: '0 1px' }}
        >
          {span.text}
        </mark>
      ) : (
        <React.Fragment key={i}>{span.text}</React.Fragment>
      )
    )}
  </>
);

interface PatternsFlyoutProps {
  http: HttpSetup;
  builtInRules: BuiltInRule[];
  customRules: CustomRule[];
  canManage: boolean;
  onSave: (patch: { builtInRules?: BuiltInRule[]; customRules?: CustomRule[] }) => Promise<void>;
  onClose: () => void;
}

export const PatternsFlyout: React.FC<PatternsFlyoutProps> = ({
  http,
  builtInRules,
  customRules: initialCustomRules,
  canManage,
  onSave,
  onClose,
}) => {
  const [localBuiltIn, setLocalBuiltIn] = useState<BuiltInRule[]>(builtInRules);
  const [localCustom, setLocalCustom] = useState<CustomRule[]>(initialCustomRules);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state — editingRule null = add mode, non-null = edit mode
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  // Preview tab state
  const [selectedFixture, setSelectedFixture] = useState<FixtureId>('security_alert');
  const [pasteText, setPasteText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate: runPreview, data: previewResult, isLoading: isPreviewing } = usePreview(http);

  const activePreviewText =
    selectedFixture === 'paste_your_own' ? pasteText : FIXTURE_TEXTS[selectedFixture];

  useEffect(() => {
    if (!activePreviewText) return;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runPreview({ text: activePreviewText, builtInRules: localBuiltIn, customRules: localCustom });
    }, 400);
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, [activePreviewText, localBuiltIn, localCustom, runPreview]);

  const analyticSpans = useMemo(() => {
    if (!previewResult) return [];
    return buildHighlightSpans(activePreviewText, previewResult.tokenMap);
  }, [previewResult, activePreviewText]);

  // Highlight token strings in the tokenized text by treating each token as its own "value"
  const tokenSpans = useMemo(() => {
    if (!previewResult) return [];
    const selfMap = Object.fromEntries(
      Object.keys(previewResult.tokenMap).map((t) => [t, t])
    );
    return buildHighlightSpans(previewResult.tokenized, selfMap);
  }, [previewResult]);

  const matchRows = useMemo(() => {
    if (!previewResult) return [];
    return Object.entries(previewResult.tokenMap).map(([token, value]) => ({
      originalValue: value,
      token,
      entityType: token.slice(0, -33),
      occurrences: activePreviewText.split(value).length - 1,
    }));
  }, [previewResult, activePreviewText]);

  const totalMasked = useMemo(
    () => matchRows.reduce((sum, row) => sum + row.occurrences, 0),
    [matchRows]
  );
  const uniqueMasked = matchRows.length;
  const rulesApplied =
    localBuiltIn.filter((r) => r.enabled).length + localCustom.filter((r) => r.enabled).length;

  const handleToggleBuiltIn = useCallback(
    (entityClass: string, enabled: boolean) => {
      setLocalBuiltIn((prev) =>
        prev.map((r) => (r.entityClass === entityClass ? { ...r, enabled } : r))
      );
    },
    []
  );

  const handleDeleteCustom = useCallback((id: string) => {
    setLocalCustom((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const openAddModal = useCallback(() => {
    setEditingRule(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((rule: CustomRule) => {
    setEditingRule(rule);
    setShowModal(true);
  }, []);

  const handleModalSave = useCallback(
    (saved: Omit<CustomRule, 'id'> & { id?: string }) => {
      if (saved.id) {
        setLocalCustom((prev) => prev.map((r) => (r.id === saved.id ? { ...r, ...saved } as CustomRule : r)));
      } else {
        const newRule: CustomRule = {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: saved.name,
          entityClass: saved.entityClass,
          pattern: saved.pattern,
          enabled: saved.enabled,
        };
        setLocalCustom((prev) => [...prev, newRule]);
      }
      setShowModal(false);
    },
    []
  );

  const filteredCustom = localCustom.filter(
    (r) =>
      searchQuery === '' ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.entityClass.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ builtInRules: localBuiltIn, customRules: localCustom });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const builtInTab = {
    id: 'built-in',
    name: i18n.translate('xpack.inferenceWorkflows.anonymization.flyout.builtInTab', {
      defaultMessage: 'Built-in types',
    }),
    content: (
      <>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.inferenceWorkflows.anonymization.flyout.builtInDescription"
            defaultMessage="Patterns maintained by Elastic. The token keeps the entity type as a prefix so the model knows what kind of thing it is looking at without seeing the value."
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiBasicTable
          data-test-subj="anonymization-built-in-table"
          items={localBuiltIn}
          rowHeader="entityClass"
          columns={[
            {
              field: 'entityClass',
              name: i18n.translate(
                'xpack.inferenceWorkflows.anonymization.flyout.builtIn.entityTypeCol',
                { defaultMessage: 'Entity type' }
              ),
              render: (val: string) => <EuiBadge color="hollow">{val}</EuiBadge>,
              width: '160px',
            },
            {
              field: 'entityClass',
              name: i18n.translate(
                'xpack.inferenceWorkflows.anonymization.flyout.builtIn.descriptionCol',
                { defaultMessage: 'What it matches' }
              ),
              render: (val: string) => (
                <EuiText size="s">{BUILT_IN_META[val]?.description ?? val}</EuiText>
              ),
            },
            {
              field: 'entityClass',
              name: i18n.translate(
                'xpack.inferenceWorkflows.anonymization.flyout.builtIn.exampleCol',
                { defaultMessage: 'Example' }
              ),
              render: (val: string) => (
                <code style={{ fontSize: '0.85em', whiteSpace: 'nowrap' }}>
                  {BUILT_IN_META[val]?.example ?? `${val}_xxxxxxxx`}
                </code>
              ),
              width: '220px',
            },
            {
              field: 'enabled',
              name: i18n.translate(
                'xpack.inferenceWorkflows.anonymization.flyout.builtIn.enabledCol',
                { defaultMessage: 'Enabled' }
              ),
              render: (val: boolean, item: BuiltInRule) => (
                <EuiSwitch
                  label=""
                  showLabel={false}
                  checked={val}
                  onChange={(e) => handleToggleBuiltIn(item.entityClass, e.target.checked)}
                  disabled={!canManage}
                  data-test-subj={`anonymization-built-in-${item.entityClass.toLowerCase()}`}
                />
              ),
              width: '80px',
            },
          ]}
        />
      </>
    ),
  };

  const customTab = {
    id: 'custom',
    name: i18n.translate('xpack.inferenceWorkflows.anonymization.flyout.customTab', {
      defaultMessage: 'Custom patterns',
    }),
    content: (
      <>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.inferenceWorkflows.anonymization.flyout.customDescription"
            defaultMessage="Identifiers that are specific to your organization, such as employee IDs, internal account numbers, badge numbers, and case IDs. The built-in types cannot cover these."
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiSearchBar
              box={{ placeholder: i18n.translate('xpack.inferenceWorkflows.anonymization.flyout.customSearch', { defaultMessage: 'Search patterns' }), incremental: true }}
              onChange={({ queryText }) => setSearchQuery(queryText ?? '')}
              data-test-subj="anonymization-custom-search"
            />
          </EuiFlexItem>
          {canManage && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                iconType="plus"
                onClick={openAddModal}
                data-test-subj="anonymization-add-pattern"
              >
                <FormattedMessage
                  id="xpack.inferenceWorkflows.anonymization.flyout.addPattern"
                  defaultMessage="Add pattern"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {filteredCustom.length === 0 ? (
          <EuiEmptyPrompt
            title={
              <h3>
                <FormattedMessage
                  id="xpack.inferenceWorkflows.anonymization.flyout.noCustomRules"
                  defaultMessage="No custom patterns"
                />
              </h3>
            }
            body={
              <FormattedMessage
                id="xpack.inferenceWorkflows.anonymization.flyout.noCustomRulesHint"
                defaultMessage="Add a regex pattern to mask custom sensitive values not covered by built-in types."
              />
            }
            actions={
              canManage ? (
                <EuiButton size="s" onClick={openAddModal} data-test-subj="anonymization-add-pattern-empty">
                  <FormattedMessage
                    id="xpack.inferenceWorkflows.anonymization.flyout.addPatternEmpty"
                    defaultMessage="Add pattern"
                  />
                </EuiButton>
              ) : undefined
            }
          />
        ) : (
          <EuiBasicTable
            data-test-subj="anonymization-custom-rules-table"
            items={filteredCustom}
            rowHeader="name"
            columns={[
              {
                field: 'name',
                name: i18n.translate('xpack.inferenceWorkflows.anonymization.flyout.customRules.nameCol', { defaultMessage: 'Name' }),
                sortable: true,
              },
              {
                field: 'entityClass',
                name: i18n.translate('xpack.inferenceWorkflows.anonymization.flyout.customRules.typeCol', { defaultMessage: 'Entity type' }),
                render: (val: string) => <EuiBadge color="hollow">{val}</EuiBadge>,
                width: '160px',
              },
              {
                field: 'pattern',
                name: i18n.translate('xpack.inferenceWorkflows.anonymization.flyout.customRules.patternCol', { defaultMessage: 'Pattern' }),
                render: (val: string) => <code style={{ fontSize: '0.85em' }}>{val}</code>,
              },
              {
                field: 'enabled',
                name: i18n.translate('xpack.inferenceWorkflows.anonymization.flyout.customRules.enabledCol', { defaultMessage: 'Enabled' }),
                render: (val: boolean, item: CustomRule) => (
                  <EuiSwitch
                    label=""
                    showLabel={false}
                    checked={val}
                    onChange={(e) =>
                      setLocalCustom((prev) =>
                        prev.map((r) => r.id === item.id ? { ...r, enabled: e.target.checked } : r)
                      )
                    }
                    disabled={!canManage}
                    data-test-subj={`anonymization-custom-toggle-${item.id}`}
                  />
                ),
                width: '80px',
              },
              ...(canManage
                ? [{
                    name: i18n.translate('xpack.inferenceWorkflows.anonymization.flyout.customRules.actionsCol', { defaultMessage: 'Actions' }),
                    width: '80px',
                    actions: [
                      {
                        render: (item: CustomRule) => (
                          <EuiPopover
                            button={
                              <EuiButtonIcon
                                iconType="boxesVertical"
                                aria-label={i18n.translate('xpack.inferenceWorkflows.anonymization.flyout.customRules.actions', { defaultMessage: 'Actions' })}
                                onClick={() => setOpenActionsId(openActionsId === item.id ? null : item.id)}
                              />
                            }
                            isOpen={openActionsId === item.id}
                            closePopover={() => setOpenActionsId(null)}
                            panelPaddingSize="none"
                            anchorPosition="leftCenter"
                          >
                            <EuiContextMenuPanel
                              items={[
                                <EuiContextMenuItem
                                  key="edit"
                                  icon="pencil"
                                  onClick={() => { setOpenActionsId(null); openEditModal(item); }}
                                >
                                  <FormattedMessage id="xpack.inferenceWorkflows.anonymization.flyout.customRules.edit" defaultMessage="Edit" />
                                </EuiContextMenuItem>,
                                <EuiContextMenuItem
                                  key="delete"
                                  icon="trash"
                                  color="danger"
                                  onClick={() => { setOpenActionsId(null); handleDeleteCustom(item.id); }}
                                >
                                  <FormattedMessage id="xpack.inferenceWorkflows.anonymization.flyout.customRules.delete" defaultMessage="Delete" />
                                </EuiContextMenuItem>,
                              ]}
                            />
                          </EuiPopover>
                        ),
                      },
                    ],
                  }]
                : []),
            ]}
          />
        )}
      </>
    ),
  };

  const previewTab = {
    id: 'preview',
    name: i18n.translate('xpack.inferenceWorkflows.anonymization.flyout.previewTab', {
      defaultMessage: 'Preview',
    }),
    content: (
      <>
        <EuiSpacer size="m" />
        <EuiButtonGroup
          legend={i18n.translate(
            'xpack.inferenceWorkflows.anonymization.preview.fixtureLegend',
            { defaultMessage: 'Select sample text' }
          )}
          options={FIXTURE_OPTIONS}
          idSelected={selectedFixture}
          onChange={(id) => {
            setSelectedFixture(id as FixtureId);
          }}
          buttonSize="s"
          data-test-subj="anonymization-preview-fixture-selector"
        />
        <EuiSpacer size="m" />
        {selectedFixture === 'paste_your_own' && (
          <>
            <EuiTextArea
              fullWidth
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={i18n.translate(
                'xpack.inferenceWorkflows.anonymization.preview.pastePlaceholder',
                { defaultMessage: 'Paste text here to preview anonymization...' }
              )}
              data-test-subj="anonymization-preview-paste-input"
              aria-label={i18n.translate(
                'xpack.inferenceWorkflows.anonymization.preview.pasteAriaLabel',
                { defaultMessage: 'Paste your own text' }
              )}
            />
            <EuiSpacer size="m" />
          </>
        )}
        {activePreviewText && (
          <>
            {previewResult && !isPreviewing && (
              <>
                <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="primary">
                      <FormattedMessage
                        id="xpack.inferenceWorkflows.anonymization.preview.totalMasked"
                        defaultMessage="{total} values masked, {unique} unique"
                        values={{ total: totalMasked, unique: uniqueMasked }}
                      />
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      <FormattedMessage
                        id="xpack.inferenceWorkflows.anonymization.preview.rulesApplied"
                        defaultMessage="{count} rules applied"
                        values={{ count: rulesApplied }}
                      />
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
              </>
            )}
            <EuiFlexGroup gutterSize="m" alignItems="flexStart">
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  <strong>
                    <FormattedMessage
                      id="xpack.inferenceWorkflows.anonymization.preview.analystPane"
                      defaultMessage="What the analyst sees"
                    />
                  </strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.85em',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    minHeight: 120,
                  }}
                  data-test-subj="anonymization-preview-analyst-pane"
                >
                  {previewResult ? (
                    <HighlightedText spans={analyticSpans} />
                  ) : (
                    <span style={{ opacity: 0.6 }}>{activePreviewText}</span>
                  )}
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  <strong>
                    <FormattedMessage
                      id="xpack.inferenceWorkflows.anonymization.preview.modelPane"
                      defaultMessage="What the model receives"
                    />
                  </strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.85em',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    minHeight: 120,
                  }}
                  data-test-subj="anonymization-preview-model-pane"
                >
                  {previewResult ? (
                    <HighlightedText
                      spans={tokenSpans}
                      highlightColor="rgba(255, 165, 0, 0.25)"
                    />
                  ) : null}
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
            {previewResult && matchRows.length > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiBasicTable
                  tableCaption={i18n.translate(
                    'xpack.inferenceWorkflows.anonymization.preview.tableCaption',
                    { defaultMessage: 'Masked values' }
                  )}
                  items={matchRows}
                  columns={[
                    {
                      field: 'originalValue',
                      name: i18n.translate(
                        'xpack.inferenceWorkflows.anonymization.preview.col.original',
                        { defaultMessage: 'Original value' }
                      ),
                    },
                    {
                      field: 'token',
                      name: i18n.translate(
                        'xpack.inferenceWorkflows.anonymization.preview.col.token',
                        { defaultMessage: 'The model sees' }
                      ),
                      render: (val: string) => (
                        <code style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>{val}</code>
                      ),
                    },
                    {
                      field: 'entityType',
                      name: i18n.translate(
                        'xpack.inferenceWorkflows.anonymization.preview.col.entityType',
                        { defaultMessage: 'Entity type' }
                      ),
                      render: (val: string) => <EuiBadge color="hollow">{val}</EuiBadge>,
                      width: '160px',
                    },
                    {
                      field: 'occurrences',
                      name: i18n.translate(
                        'xpack.inferenceWorkflows.anonymization.preview.col.occurrences',
                        { defaultMessage: 'Occurrences' }
                      ),
                      width: '120px',
                    },
                  ]}
                />
                <EuiSpacer size="m" />
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.inferenceWorkflows.anonymization.preview.footerNote"
                    defaultMessage="This mapping lives in memory for one request and is discarded when the response is returned. It is never written to disk."
                  />
                </EuiText>
              </>
            )}
          </>
        )}
      </>
    ),
  };

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      resizable
      aria-labelledby="anonymization-patterns-flyout-title"
      data-test-subj="anonymizationPatternsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="anonymization-patterns-flyout-title">
            <FormattedMessage
              id="xpack.inferenceWorkflows.anonymization.flyout.title"
              defaultMessage="Anonymization patterns"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.inferenceWorkflows.anonymization.flyout.bodyDescription"
            defaultMessage="These rules apply to every LLM call from this space. Values are replaced with tokens on the way out and restored on the way back, so analysts always see real values."
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabbedContent
          tabs={[builtInTab, customTab, previewTab]}
          initialSelectedTab={builtInTab}
        />
      </EuiFlyoutBody>

      {showModal && (
        <CustomPatternModal
          http={http}
          editingRule={editingRule}
          onSave={handleModalSave}
          onClose={() => setShowModal(false)}
        />
      )}

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="anonymization-flyout-close">
              <FormattedMessage
                id="xpack.inferenceWorkflows.anonymization.flyout.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          {canManage && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isSaving}
                onClick={handleSave}
                data-test-subj="anonymization-flyout-save"
              >
                <FormattedMessage
                  id="xpack.inferenceWorkflows.anonymization.flyout.save"
                  defaultMessage="Save patterns"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
