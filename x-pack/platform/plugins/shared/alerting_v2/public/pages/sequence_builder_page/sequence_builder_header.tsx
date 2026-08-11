/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { useWatch } from 'react-hook-form';
import { isSequenceValid } from '@kbn/alerting-v2-rule-form';
import type { FormValues, SequenceFormValues } from '@kbn/alerting-v2-rule-form';
import type { SequenceBuilderStep } from './use_sequence_builder_form';
import { useCanSaveSequenceRule } from './use_can_save_sequence_rule';

const FALLBACK_TITLE = i18n.translate('xpack.alertingV2.sequenceBuilderPage.untitledTitle', {
  defaultMessage: 'Untitled sequence rule',
});

export interface SequenceBuilderHeaderProps {
  step: SequenceBuilderStep;
  sidebarOpen: boolean;
  seqValues: SequenceFormValues;
  isSaving: boolean;
  rulesListHref: string;
  onStepChange: (step: SequenceBuilderStep) => void;
  onToggleDetails: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export const SequenceBuilderHeader: React.FC<SequenceBuilderHeaderProps> = ({
  step,
  sidebarOpen,
  seqValues,
  isSaving,
  rulesListHref,
  onStepChange,
  onToggleDetails,
  onSave,
  onCancel,
}) => {
  const ruleName = useWatch<FormValues, 'metadata.name'>({ name: 'metadata.name' });
  const sequenceValid = isSequenceValid(seqValues);
  const canSave = useCanSaveSequenceRule(seqValues, isSaving);

  const pageTitle = ruleName?.trim() || FALLBACK_TITLE;

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
    const items: AppHeaderMenu['items'] = [
      {
        id: 'alertStep',
        label: i18n.translate('xpack.alertingV2.sequenceBuilderPage.alertConditionButton', {
          defaultMessage: 'Alert condition',
        }),
        iconType: 'bell',
        order: 1,
        run: () => onStepChange('alert'),
        disableButton: isSaving,
        isSelected: step === 'alert' && !sidebarOpen,
        testId: 'sequenceBuilderGoToAlert',
      },
      {
        id: 'recoveryStep',
        label: i18n.translate('xpack.alertingV2.sequenceBuilderPage.recoveryConditionButton', {
          defaultMessage: 'Recovery condition',
        }),
        iconType: 'checkCircle',
        order: 2,
        run: () => onStepChange('recovery'),
        disableButton: isSaving || !sequenceValid,
        tooltipContent: sequenceValid
          ? undefined
          : i18n.translate('xpack.alertingV2.sequenceBuilderPage.recoveryDisabledTooltip', {
              defaultMessage: 'Add at least two steps with rules to proceed',
            }),
        isSelected: step === 'recovery' && !sidebarOpen,
        testId: 'sequenceBuilderGoToRecovery',
      },
      {
        id: 'details',
        label: i18n.translate('xpack.alertingV2.sequenceBuilderPage.detailsButton', {
          defaultMessage: 'Details',
        }),
        iconType: 'gear',
        order: 3,
        run: onToggleDetails,
        disableButton: isSaving,
        isSelected: sidebarOpen,
        testId: 'sequenceBuilderOpenDetails',
      },
    ];

    return {
      items,
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
  }, [
    step,
    sidebarOpen,
    isSaving,
    sequenceValid,
    canSave,
    saveDisabledReason,
    onStepChange,
    onToggleDetails,
    onSave,
  ]);

  return (
    <AppHeader
      sticky={false}
      title={pageTitle}
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
