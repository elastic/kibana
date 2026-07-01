/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { INLINE_ACTION_STEP_DEFINITIONS } from '../registry';
import type { ActionDraft, ActionTemplate } from '../types';
import { getActionTemplateKey } from '../types';

interface ActionTemplateCard {
  key: string;
  template: ActionTemplate;
  label: string;
  description: string;
  iconType: string;
}

export const ACTION_TEMPLATE_CARDS: readonly ActionTemplateCard[] = [
  {
    key: getActionTemplateKey({ source: 'existing' }),
    template: { source: 'existing' },
    label: i18n.translate(
      'xpack.responseOps.alertingV2RuleForm.actionForm.card.existingWorkflow.label',
      { defaultMessage: 'Workflow' }
    ),
    description: i18n.translate(
      'xpack.responseOps.alertingV2RuleForm.actionForm.card.existingWorkflow.description',
      { defaultMessage: 'Select an existing workflow' }
    ),
    iconType: 'workflowsApp',
  },
  ...INLINE_ACTION_STEP_DEFINITIONS.map((definition) => ({
    key: getActionTemplateKey({ source: 'inline', stepType: definition.id }),
    template: { source: 'inline', stepType: definition.id } as const,
    label: definition.label,
    description: definition.description ?? '',
    iconType: definition.iconType ?? 'gear',
  })),
];

export const getTemplateForAction = (action: ActionDraft): ActionTemplate =>
  action.source === 'existing'
    ? { source: 'existing' }
    : { source: 'inline', stepType: action.stepType };

export const findActionTemplateCard = (
  template: ActionTemplate
): ActionTemplateCard | undefined => {
  const key = getActionTemplateKey(template);
  return ACTION_TEMPLATE_CARDS.find((card) => card.key === key);
};

interface ActionTemplateCardsProps {
  onPick: (template: ActionTemplate) => void;
  onCancel?: () => void;
}

export const ActionTemplateCards = ({ onPick, onCancel }: ActionTemplateCardsProps) => (
  <>
    <EuiFlexGroup direction="column" gutterSize="s">
      {ACTION_TEMPLATE_CARDS.map((card) => (
        <EuiFlexItem key={card.key}>
          <EuiCard
            paddingSize="s"
            layout="horizontal"
            display="plain"
            hasBorder
            titleSize="xs"
            icon={<EuiIcon type={card.iconType} size="l" aria-hidden={true} />}
            title={
              <EuiText size="s">
                <p>{card.label}</p>
              </EuiText>
            }
            description={
              <EuiText size="s" color="subdued">
                <p>{card.description}</p>
              </EuiText>
            }
            onClick={() => onPick(card.template)}
            data-test-subj={`actionTemplateCard-${card.key}`}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
    {onCancel && (
      <>
        <EuiSpacer size="s" />
        <EuiButtonEmpty onClick={onCancel} data-test-subj="actionFormCancelPicker">
          {i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.list.cancelPicker', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
      </>
    )}
  </>
);
