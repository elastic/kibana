/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import {
  EuiConfirmModal,
  EuiIconTip,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as commonI18n from '../../../../../common/translations';
import * as redesignI18n from '../../../translations';

export interface TemplateFieldSummary {
  name: string;
  label: string;
}

export interface TemplateSummary {
  name: string;
  fieldDefinitions?: TemplateFieldSummary[];
}

export interface ConfirmChangeTemplateModalProps {
  /** The template currently applied to the case, if any. */
  oldTemplate?: TemplateSummary;
  /** The template the user picked, if any (omitted when the user is clearing the selection). */
  newTemplate?: TemplateSummary;
  isLoading?: boolean;
  isConfirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TemplateNameWithFields: FC<{ template: TemplateSummary }> = ({ template }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiText component="span" style={{ fontWeight: euiTheme.font.weight.bold }}>
      {template.name}{' '}
      {template.fieldDefinitions && template.fieldDefinitions.length > 0 ? (
        <EuiIconTip
          type="list"
          size="s"
          position="top"
          aria-label={redesignI18n.TEMPLATE_FIELDS_TOOLTIP_ARIA(template.name)}
          anchorProps={{ 'data-test-subj': 'confirm-change-template-modal-fields-icon' }}
          content={
            <div data-test-subj="confirm-change-template-modal-fields-tooltip">
              {template.fieldDefinitions.map((field, idx) => (
                <div key={`${field.name}-${idx}`}>{field.label}</div>
              ))}
            </div>
          }
        />
      ) : null}
    </EuiText>
  );
};

TemplateNameWithFields.displayName = 'TemplateNameWithFields';

const ConfirmChangeTemplateModalDescription: FC<{
  oldTemplate?: TemplateSummary;
  newTemplate?: TemplateSummary;
}> = ({ oldTemplate, newTemplate }) => {
  if (oldTemplate && newTemplate) {
    return (
      <FormattedMessage
        id="xpack.cases.casesRedesign.details.confirmChangeTemplateDescription"
        defaultMessage="Are you sure you want to change from {oldTemplate} to {newTemplate}?"
        values={{
          oldTemplate: <TemplateNameWithFields template={oldTemplate} />,
          newTemplate: <TemplateNameWithFields template={newTemplate} />,
        }}
      />
    );
  }

  if (newTemplate) {
    return (
      <FormattedMessage
        id="xpack.cases.casesRedesign.details.confirmApplyTemplateDescription"
        defaultMessage="Are you sure you want to apply {newTemplate}?"
        values={{
          newTemplate: <TemplateNameWithFields template={newTemplate} />,
        }}
      />
    );
  }

  if (oldTemplate) {
    return (
      <FormattedMessage
        id="xpack.cases.casesRedesign.details.confirmRemoveTemplateDescription"
        defaultMessage="Are you sure you want to remove {oldTemplate}?"
        values={{
          oldTemplate: <TemplateNameWithFields template={oldTemplate} />,
        }}
      />
    );
  }

  return null;
};

ConfirmChangeTemplateModalDescription.displayName = 'ConfirmChangeTemplateModalDescription';

const getConfirmButtonText = (oldTemplate?: TemplateSummary, newTemplate?: TemplateSummary) => {
  if (oldTemplate && newTemplate) return redesignI18n.CHANGE_TEMPLATE_MODAL_CHANGE_BUTTON;
  if (newTemplate) return redesignI18n.CHANGE_TEMPLATE_MODAL_APPLY_BUTTON;
  return redesignI18n.CHANGE_TEMPLATE_MODAL_REMOVE_BUTTON;
};

export const ConfirmChangeTemplateModal: FC<ConfirmChangeTemplateModalProps> = ({
  oldTemplate,
  newTemplate,
  isLoading = false,
  isConfirmDisabled = false,
  onConfirm,
  onCancel,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      title={redesignI18n.CHANGE_TEMPLATE_MODAL_TITLE}
      titleProps={{ id: modalTitleId }}
      aria-labelledby={modalTitleId}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={commonI18n.CANCEL}
      confirmButtonText={getConfirmButtonText(oldTemplate, newTemplate)}
      confirmButtonDisabled={isConfirmDisabled}
      isLoading={isLoading}
      defaultFocusedButton="confirm"
      data-test-subj="confirm-change-template-modal"
    >
      <ConfirmChangeTemplateModalDescription oldTemplate={oldTemplate} newTemplate={newTemplate} />
    </EuiConfirmModal>
  );
};

ConfirmChangeTemplateModal.displayName = 'ConfirmChangeTemplateModal';
