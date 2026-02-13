/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart, HttpStart } from '@kbn/core/public';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiButton,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { FormValues } from '../form/types';
import { useCreateRule } from '../form/hooks/use_create_rule';

export interface RuleFormFlyoutServices {
  http: HttpStart;
  notifications: NotificationsStart;
}

export interface RuleFormFlyoutProps {
  /** Whether to use push flyout or overlay */
  push?: boolean;
  /** Callback when flyout is closed */
  onClose?: () => void;
  /** Services required for rule creation */
  services: RuleFormFlyoutServices;
  /** The form component (DynamicRuleForm or StandaloneRuleForm) */
  children: React.ReactElement<{
    formId: string;
    onSubmit: (values: FormValues) => void;
  }>;
}

const FORM_ID = 'ruleV2Form';
const FLYOUT_TITLE_ID = 'ruleV2FormFlyoutTitle';

const RuleFormFlyoutComponent: React.FC<RuleFormFlyoutProps> = ({
  push = true,
  onClose,
  services,
  children,
}) => {
  const { http, notifications } = services;

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const { createRule, isLoading } = useCreateRule({
    http,
    notifications,
    onSuccess: handleClose,
  });

  const onSubmit = (values: FormValues) => {
    createRule(values);
  };

  // Clone child to inject formId and onSubmit
  const childWithProps = React.cloneElement(children, {
    formId: FORM_ID,
    onSubmit,
  });

  return (
    <EuiFlyout
      session="start"
      flyoutMenuProps={{
        title: 'Create Alert Rule',
        hideTitle: true,
      }}
      type={push ? 'push' : 'overlay'}
      onClose={handleClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      size="s"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={FLYOUT_TITLE_ID}>
          <h2>
            <FormattedMessage
              id="xpack.alertingV2.ruleForm.flyoutTitle"
              defaultMessage="Create Alert Rule"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{childWithProps}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} isLoading={isLoading}>
              <FormattedMessage
                id="xpack.alertingV2.ruleForm.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill isLoading={isLoading} form={FORM_ID} type="submit">
              <FormattedMessage
                id="xpack.alertingV2.ruleForm.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const RuleFormFlyout: React.FC<RuleFormFlyoutProps> = (props) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <RuleFormFlyoutComponent {...props} />
    </QueryClientProvider>
  );
};
