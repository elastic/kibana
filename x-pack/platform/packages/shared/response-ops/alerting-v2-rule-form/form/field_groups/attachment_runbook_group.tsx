/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonIcon, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FieldGroup } from './field_group';

export const AttacmentRunbookGroup: React.FC = () => {
  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.attachmentsGroupTitle', {
        defaultMessage: 'Attachments',
      })}
    >
      <EuiButton
        iconType="plusInCircle"
        onClick={() => {
          // eslint-disable-next-line no-console
          console.log('add runbook'); // TODO: open runbook flyout
        }}
        size="s"
        data-test-subj="addRunbookButton"
        color="text"
      >
        {i18n.translate('xpack.alertingV2.ruleForm.addRunbookButton', {
          defaultMessage: 'Add Runbook',
        })}
      </EuiButton>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.alertingV2.ruleForm.runbookTitle', {
            defaultMessage: 'Runbook',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="s">
        <EuiText size="s">
          {i18n.translate('xpack.alertingV2.ruleForm.runbookTitle', {
            defaultMessage: 'Runbook Title (first line of text)',
          })}
        </EuiText>
        <EuiButtonIcon
          iconType="pencil"
          onClick={() => {}}
          aria-label={i18n.translate('xpack.alertingV2.ruleForm.editRunbookButton', {
            defaultMessage: 'Edit Runbook',
          })}
          color="text"
        />
        <EuiButtonIcon
          iconType="trash"
          onClick={() => {}}
          aria-label={i18n.translate('xpack.alertingV2.ruleForm.deleteRunbookButton', {
            defaultMessage: 'Delete Runbook',
          })}
          color="danger"
        />
      </EuiPanel>
    </FieldGroup>
  );
};
