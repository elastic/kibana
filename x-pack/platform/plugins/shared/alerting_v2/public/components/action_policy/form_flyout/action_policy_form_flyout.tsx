/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { FormProvider } from 'react-hook-form';
import { useIsActionPoliciesLicenseValid } from '../../../hooks/use_is_action_policies_license_valid';
import { ActionPoliciesLicenseCallout } from '../action_policies_license_callout';
import { ActionPolicyForm } from '../form/action_policy_form';
import type { ActionPolicyFormState } from '../form/types';
import { useActionPolicyForm } from '../form/use_action_policy_form';

const FLYOUT_TITLE_ID = 'actionPolicyFlyoutTitle';

const noop = () => {};

interface ActionPolicyFormFlyoutProps {
  onClose: () => void;
  /**
   * Receives the raw form state so the host can create the workflows and build the payload
   */
  onSave?: (values: ActionPolicyFormState) => void | Promise<void>;
  onUpdate?: (id: string, values: ActionPolicyFormState) => void | Promise<void>;
  isLoading?: boolean;
  initialValues?: ActionPolicyResponse;
}

export const ActionPolicyFormFlyout = ({
  onClose,
  onSave,
  onUpdate,
  isLoading = false,
  initialValues,
}: ActionPolicyFormFlyoutProps) => {
  const application = useService(CoreStart('application'));
  const isLicenseValid = useIsActionPoliciesLicenseValid();
  const { methods, isEditMode, handleSubmit } = useActionPolicyForm({
    initialValues,
    onSubmitCreate: onSave ?? noop,
    onSubmitUpdate: onUpdate ?? noop,
  });

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <EuiFlyout
      onClose={handleClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      size="fill"
      ownFocus
      outsideClickCloses={isLoading ? false : undefined}
      hideCloseButton={isLoading}
      onKeyDownCapture={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (isLoading && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={FLYOUT_TITLE_ID}>
          <h2 data-test-subj="title">
            {isEditMode ? (
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.formFlyout.editTitle"
                defaultMessage="Edit action policy"
              />
            ) : (
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.formFlyout.title"
                defaultMessage="Create action policy"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ActionPoliciesLicenseCallout />
        <FormProvider {...methods}>
          <ActionPolicyForm
            config={{
              layout: 'flyout',
              connectorCreation: {
                mode: 'new-tab',
                href: application.getUrlForApp('management', {
                  deepLinkId: 'triggersActionsConnectors',
                  path: '/connectors',
                }),
              },
              collapsibleSections: {
                notificationControls: { initialIsOpen: false },
                destination: { initialIsOpen: true },
              },
            }}
          />
        </FormProvider>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={handleClose}
              isLoading={isLoading}
              data-test-subj="cancelButton"
            >
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.formFlyout.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={!isLicenseValid}
              data-test-subj="submitButton"
            >
              {isEditMode ? (
                <FormattedMessage
                  id="xpack.alertingV2.actionPolicy.formFlyout.update"
                  defaultMessage="Update policy"
                />
              ) : (
                <FormattedMessage
                  id="xpack.alertingV2.actionPolicy.formFlyout.save"
                  defaultMessage="Create policy"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
