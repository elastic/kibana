/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSuperSelect,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RegexAnonymizationRule } from '@kbn/inference-common';
import { CUSTOM_PATTERN_ENTITY_CLASSES } from '../lib/entity_classes';
import type { CustomPatternEntityClass } from '../lib/entity_classes';
import type { NewCustomPattern } from '../hooks/use_anonymization_settings';
import { PatternTesterPanel } from './pattern_tester_panel';

interface PatternFlyoutProps {
  /** When editing an existing custom pattern; omitted when adding a new one. */
  pattern?: RegexAnonymizationRule;
  /** All other currently-enabled rules, used so the inline tester reflects the full pipeline. */
  enabledRules: RegexAnonymizationRule[];
  onSave: (pattern: NewCustomPattern) => Promise<void>;
  onClose: () => void;
}

const entityTypeOptions = CUSTOM_PATTERN_ENTITY_CLASSES.map((entityClass) => ({
  value: entityClass,
  inputDisplay: entityClass,
}));

export const PatternFlyout: React.FC<PatternFlyoutProps> = ({
  pattern,
  enabledRules,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(pattern);
  const [name, setName] = useState(pattern?.name ?? '');
  const [entityClass, setEntityClass] = useState<CustomPatternEntityClass>(
    (pattern?.entityClass as CustomPatternEntityClass | undefined) ??
      CUSTOM_PATTERN_ENTITY_CLASSES[0]
  );
  const [regexPattern, setRegexPattern] = useState(pattern?.pattern ?? '');
  const [enabled, setEnabled] = useState(pattern?.enabled ?? true);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const flyoutTitleId = useGeneratedHtmlId();
  const testerModalTitleId = useGeneratedHtmlId();

  const isValid = name.trim().length > 0 && regexPattern.trim().length > 0;

  const draftRule: RegexAnonymizationRule = useMemo(
    () => ({
      type: 'RegExp',
      id: pattern?.id ?? 'draft',
      name: name || 'Draft pattern',
      entityClass,
      pattern: regexPattern,
      enabled: true,
      builtIn: false,
    }),
    [pattern?.id, name, entityClass, regexPattern]
  );

  const testerRules = useMemo(
    () => [draftRule, ...enabledRules.filter((rule) => rule.id !== pattern?.id)],
    [draftRule, enabledRules, pattern?.id]
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), entityClass, pattern: regexPattern.trim(), enabled });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      aria-labelledby={flyoutTitleId}
      data-test-subj="aiAnonymizationSettingsPatternFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={flyoutTitleId}>
          <h2>
            {isEditing ? (
              <FormattedMessage
                id="xpack.aiAnonymizationSettings.patternFlyout.editTitle"
                defaultMessage="Edit pattern"
              />
            ) : (
              <FormattedMessage
                id="xpack.aiAnonymizationSettings.patternFlyout.addTitle"
                defaultMessage="Add new pattern"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form">
          <EuiFormRow
            label={i18n.translate('xpack.aiAnonymizationSettings.patternFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            helpText={i18n.translate('xpack.aiAnonymizationSettings.patternFlyout.nameHelp', {
              defaultMessage: 'Shown in the pattern list and in audit records.',
            })}
          >
            <EuiFieldText
              placeholder={i18n.translate(
                'xpack.aiAnonymizationSettings.patternFlyout.namePlaceholder',
                { defaultMessage: 'e.g. Employee ID' }
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-test-subj="aiAnonymizationSettingsPatternFlyoutName"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.aiAnonymizationSettings.patternFlyout.entityTypeLabel', {
              defaultMessage: 'Entity type',
            })}
            helpText={i18n.translate('xpack.aiAnonymizationSettings.patternFlyout.entityTypeHelp', {
              defaultMessage: 'Becomes the token prefix, so the model knows the kind of value.',
            })}
          >
            <EuiSuperSelect
              options={entityTypeOptions}
              valueOfSelected={entityClass}
              onChange={(value) => setEntityClass(value as typeof entityClass)}
              data-test-subj="aiAnonymizationSettingsPatternFlyoutEntityType"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.aiAnonymizationSettings.patternFlyout.patternLabel', {
              defaultMessage: 'Pattern',
            })}
            helpText={i18n.translate('xpack.aiAnonymizationSettings.patternFlyout.patternHelp', {
              defaultMessage:
                'A regular expression, evaluated with the global flag. Matching is case-sensitive.',
            })}
          >
            <EuiFieldText
              prepend="/"
              append="/g"
              placeholder={i18n.translate(
                'xpack.aiAnonymizationSettings.patternFlyout.patternPlaceholder',
                { defaultMessage: 'e.g. EMP-\\d+' }
              )}
              value={regexPattern}
              onChange={(e) => setRegexPattern(e.target.value)}
              data-test-subj="aiAnonymizationSettingsPatternFlyoutPattern"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.aiAnonymizationSettings.patternFlyout.enabledLabel', {
              defaultMessage: 'Enabled',
            })}
          >
            <EuiSwitch
              showLabel={false}
              label=""
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              data-test-subj="aiAnonymizationSettingsPatternFlyoutEnabled"
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiButton
              iconType="play"
              onClick={() => setIsTesterOpen(true)}
              isDisabled={!regexPattern.trim()}
              data-test-subj="aiAnonymizationSettingsPatternFlyoutTestButton"
            >
              <FormattedMessage
                id="xpack.aiAnonymizationSettings.patternFlyout.testButton"
                defaultMessage="Pattern tester"
              />
            </EuiButton>
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage
                id="xpack.aiAnonymizationSettings.patternFlyout.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSave}
              isDisabled={!isValid}
              isLoading={isSaving}
              data-test-subj="aiAnonymizationSettingsPatternFlyoutSave"
            >
              <FormattedMessage
                id="xpack.aiAnonymizationSettings.patternFlyout.save"
                defaultMessage="Save pattern"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
      {isTesterOpen && (
        <EuiModal
          onClose={() => setIsTesterOpen(false)}
          aria-labelledby={testerModalTitleId}
          data-test-subj="aiAnonymizationSettingsPatternFlyoutTesterModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={testerModalTitleId}>
              <FormattedMessage
                id="xpack.aiAnonymizationSettings.patternFlyout.testerModalTitle"
                defaultMessage="Pattern tester"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <PatternTesterPanel rules={testerRules} />
          </EuiModalBody>
        </EuiModal>
      )}
    </EuiFlyout>
  );
};
