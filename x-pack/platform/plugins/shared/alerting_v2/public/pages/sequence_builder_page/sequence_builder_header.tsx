/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { useFormContext, useWatch } from 'react-hook-form';
import { isSequenceValid } from '@kbn/alerting-v2-rule-form';
import type { FormValues, SequenceFormValues } from '@kbn/alerting-v2-rule-form';
import { experimentalBadge } from '../../components/experimental_badge';
import { DEFAULT_SEQUENCE_RULE_NAME } from './use_sequence_builder_form';

export interface SequenceBuilderHeaderProps {
  seqValues: SequenceFormValues;
  isSaving: boolean;
  rulesListHref: string;
  onSave: () => void;
  onCancel: () => void;
}

export const SequenceBuilderHeader: React.FC<SequenceBuilderHeaderProps> = ({
  seqValues,
  isSaving,
  rulesListHref,
  onSave,
  onCancel,
}) => {
  const { setValue } = useFormContext<FormValues>();
  const ruleName = useWatch<FormValues, 'metadata.name'>({ name: 'metadata.name' });
  const sequenceValid = isSequenceValid(seqValues);
  const trimmedName = (ruleName ?? '').trim();
  const canSave =
    !isSaving &&
    sequenceValid &&
    trimmedName.length > 0 &&
    trimmedName !== DEFAULT_SEQUENCE_RULE_NAME;

  const onTitleSave = useCallback(
    async (newName: string) => {
      setValue('metadata.name', newName);
    },
    [setValue]
  );

  const editableTitle = useMemo(
    () => ({
      text: ruleName ?? DEFAULT_SEQUENCE_RULE_NAME,
      onSave: onTitleSave,
    }),
    [ruleName, onTitleSave]
  );

  const saveDisabledReason = useMemo(() => {
    if (isSaving) return undefined;
    if (!sequenceValid) {
      return i18n.translate('xpack.alertingV2.sequenceBuilderPage.saveDisabledSequenceTooltip', {
        defaultMessage: 'Add at least two steps with rules to save',
      });
    }
    if (!canSave && !isSaving) {
      return i18n.translate('xpack.alertingV2.sequenceBuilderPage.saveDisabledGenericTooltip', {
        defaultMessage: 'Enter a valid rule name and fix any validation errors to save',
      });
    }
    return undefined;
  }, [isSaving, sequenceValid, canSave]);

  const menu = useMemo((): AppHeaderMenu => {
    return {
      items: [],
      primaryActionItem: {
        id: 'save',
        label: i18n.translate('xpack.alertingV2.sequenceBuilderPage.saveButton', {
          defaultMessage: 'Save',
        }),
        iconType: 'check',
        run: onSave,
        isLoading: isSaving,
        disableButton: !canSave,
        tooltipContent: saveDisabledReason,
        testId: 'sequenceBuilderSave',
      },
    };
  }, [isSaving, canSave, saveDisabledReason, onSave]);

  return (
    <AppHeader
      sticky={false}
      title={editableTitle}
      badges={[experimentalBadge]}
      spacing="bleed"
      back={{
        href: rulesListHref,
        label: i18n.translate('xpack.alertingV2.sequenceBuilderPage.backToRulesLabel', {
          defaultMessage: 'Rules',
        }),
        onClick: (event) => {
          event.preventDefault();
          onCancel();
        },
      }}
      menu={menu}
      showAddIntegrations={false}
    />
  );
};
