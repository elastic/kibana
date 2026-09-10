/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
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

const SAMPLE_TEXT = `Hello, please email alice@example.com or contact the team.
The server at 192.168.1.10 is under maintenance.
Login as username: jdoe to access the system.`;

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
  const [previewText, setPreviewText] = useState(SAMPLE_TEXT);
  const { mutate: runPreview, data: previewResult, isLoading: isPreviewing } = usePreview(http);

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
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.inferenceWorkflows.anonymization.flyout.previewDescription"
            defaultMessage="Enter sample text to see how it would be tokenized with the current rule set. Uses the real RE2 engine — matches exactly what production would produce."
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTextArea
          fullWidth
          rows={6}
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          data-test-subj="anonymization-preview-input"
          aria-label={i18n.translate(
            'xpack.inferenceWorkflows.anonymization.flyout.previewInput',
            { defaultMessage: 'Preview input text' }
          )}
        />
        <EuiSpacer size="s" />
        <EuiButton
          size="s"
          isLoading={isPreviewing}
          onClick={() =>
            runPreview({ text: previewText, builtInRules: localBuiltIn, customRules: localCustom })
          }
          data-test-subj="anonymization-preview-run"
        >
          <FormattedMessage
            id="xpack.inferenceWorkflows.anonymization.flyout.previewRun"
            defaultMessage="Tokenize"
          />
        </EuiButton>
        {previewResult && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.inferenceWorkflows.anonymization.flyout.previewResult"
                  defaultMessage="Tokenized text (what the model receives):"
                />
              </strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <pre
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
              data-test-subj="anonymization-preview-result"
            >
              {previewResult.tokenized}
            </pre>
            {Object.keys(previewResult.tokenMap).length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <strong>
                    <FormattedMessage
                      id="xpack.inferenceWorkflows.anonymization.flyout.previewTokenMap"
                      defaultMessage="Token map (held in memory, never sent to the model):"
                    />
                  </strong>
                </EuiText>
                <EuiBasicTable
                  tableCaption="Token map"
                  items={Object.entries(previewResult.tokenMap).map(([token, value]) => ({
                    token,
                    value,
                  }))}
                  columns={[
                    { field: 'token', name: 'Token' },
                    { field: 'value', name: 'Original value' },
                  ]}
                />
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
