/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface RuleFooterProps {
  onSave: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isEditing: boolean;
}

export const RuleFooter: React.FC<RuleFooterProps> = ({
  onSave,
  onCancel,
  isSubmitting,
  isEditing,
}) => {
  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={onSave}
          isLoading={isSubmitting}
          fill
          data-test-subj="alertingV2CreateRuleSubmit"
        >
          {isEditing ? (
            <FormattedMessage
              id="xpack.alertingV2.createRule.saveLabel"
              defaultMessage="Save changes"
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.createRule.submitLabel"
              defaultMessage="Create rule"
            />
          )}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="cancelCreateRule">
          <FormattedMessage id="xpack.alertingV2.createRule.cancelLabel" defaultMessage="Cancel" />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
