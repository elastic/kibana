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
  EuiHealth,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HttpSetup } from '@kbn/core/public';
import type { BuiltInRule, CustomRule } from './types';
import { usePreview } from './use_anonymization_settings';

const BUILT_IN_LABELS: Record<string, string> = {
  EMAIL: i18n.translate('xpack.inferenceWorkflows.anonymization.builtIn.email', {
    defaultMessage: 'Email addresses',
  }),
  IP: i18n.translate('xpack.inferenceWorkflows.anonymization.builtIn.ip', {
    defaultMessage: 'IP addresses',
  }),
  HOST_NAME: i18n.translate('xpack.inferenceWorkflows.anonymization.builtIn.hostname', {
    defaultMessage: 'Hostnames / domains',
  }),
  USER_NAME: i18n.translate('xpack.inferenceWorkflows.anonymization.builtIn.username', {
    defaultMessage: 'Usernames',
  }),
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
            defaultMessage="Elastic-authored patterns for common PII types. Enable or disable each type to control what gets masked."
          />
        </EuiText>
        <EuiSpacer size="m" />
        {localBuiltIn.map((rule) => (
          <EuiFlexGroup key={rule.entityClass} alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={BUILT_IN_LABELS[rule.entityClass] ?? rule.entityClass}
                checked={rule.enabled}
                onChange={(e) => handleToggleBuiltIn(rule.entityClass, e.target.checked)}
                disabled={!canManage}
                data-test-subj={`anonymization-built-in-${rule.entityClass.toLowerCase()}`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
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
        {localCustom.length === 0 ? (
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
          />
        ) : (
          <EuiBasicTable
            data-test-subj="anonymization-custom-rules-table"
            items={localCustom}
            rowHeader="name"
            columns={[
              {
                field: 'name',
                name: i18n.translate(
                  'xpack.inferenceWorkflows.anonymization.flyout.customRules.nameCol',
                  { defaultMessage: 'Name' }
                ),
              },
              {
                field: 'entityClass',
                name: i18n.translate(
                  'xpack.inferenceWorkflows.anonymization.flyout.customRules.typeCol',
                  { defaultMessage: 'Type' }
                ),
                render: (val: string) => <EuiBadge>{val}</EuiBadge>,
              },
              {
                field: 'pattern',
                name: i18n.translate(
                  'xpack.inferenceWorkflows.anonymization.flyout.customRules.patternCol',
                  { defaultMessage: 'Pattern' }
                ),
                render: (val: string) => <code>{val}</code>,
              },
              {
                field: 'enabled',
                name: i18n.translate(
                  'xpack.inferenceWorkflows.anonymization.flyout.customRules.statusCol',
                  { defaultMessage: 'Status' }
                ),
                render: (val: boolean) => (
                  <EuiHealth color={val ? 'success' : 'subdued'}>
                    {val
                      ? i18n.translate(
                          'xpack.inferenceWorkflows.anonymization.flyout.customRules.enabled',
                          { defaultMessage: 'Active' }
                        )
                      : i18n.translate(
                          'xpack.inferenceWorkflows.anonymization.flyout.customRules.disabled',
                          { defaultMessage: 'Disabled' }
                        )}
                  </EuiHealth>
                ),
              },
              ...(canManage
                ? [
                    {
                      name: '',
                      actions: [
                        {
                          render: (item: CustomRule) => (
                            <EuiButtonIcon
                              iconType="trash"
                              color="danger"
                              aria-label={i18n.translate(
                                'xpack.inferenceWorkflows.anonymization.flyout.customRules.delete',
                                { defaultMessage: 'Delete rule' }
                              )}
                              onClick={() => handleDeleteCustom(item.id)}
                            />
                          ),
                        },
                      ],
                    },
                  ]
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
              defaultMessage="Manage anonymization patterns"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTabbedContent
          tabs={[builtInTab, customTab, previewTab]}
          initialSelectedTab={builtInTab}
        />
      </EuiFlyoutBody>

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
