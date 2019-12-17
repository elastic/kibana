/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Policy } from '../../../../common/types/domain_data';
import { PolicyForm } from '../../../components';
import { useLibs } from '../../../hooks';

interface Props {
  policy: Policy;
  onClose: () => void;
}

export const EditPolicyFlyout: React.FC<Props> = ({ policy: originalPolicy, onClose }) => {
  const libs = useLibs();

  const [policy, setPolicy] = useState<Partial<Policy>>({
    name: originalPolicy.name,
    description: originalPolicy.description,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const updatePolicy = (updatedFields: Partial<Policy>) => {
    setPolicy({
      ...policy,
      ...updatedFields,
    });
  };

  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="FleetEditPolicyFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="FleetEditPolicyFlyoutTitle">
          <FormattedMessage id="xpack.fleet.editPolicy.flyoutTitle" defaultMessage="Edit policy" />
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );

  const body = (
    <EuiFlyoutBody>
      <PolicyForm policy={policy} updatePolicy={updatePolicy} />
    </EuiFlyoutBody>
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            <FormattedMessage
              id="xpack.fleet.editPolicy.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isLoading={isLoading}
            onClick={async () => {
              setIsLoading(true);
              try {
                const { success, error } = await libs.policies.update(originalPolicy.id, policy);
                if (success) {
                  libs.framework.notifications.addSuccess(
                    i18n.translate('xpack.fleet.editPolicy.successNotificationTitle', {
                      defaultMessage: "Policy '{name}' updated",
                      values: { name: policy.name },
                    })
                  );
                } else {
                  libs.framework.notifications.addDanger(
                    error
                      ? error.message
                      : i18n.translate('xpack.fleet.editPolicy.errorNotificationTitle', {
                          defaultMessage: 'Unable to update policy',
                        })
                  );
                }
              } catch (e) {
                libs.framework.notifications.addDanger(
                  i18n.translate('xpack.fleet.editPolicy.errorNotificationTitle', {
                    defaultMessage: 'Unable to update policy',
                  })
                );
              }
              setIsLoading(false);
              onClose();
            }}
          >
            <FormattedMessage
              id="xpack.fleet.editPolicy.submitButtonLabel"
              defaultMessage="Update"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <EuiFlyout onClose={onClose} size="m" maxWidth={400}>
      {header}
      {body}
      {footer}
    </EuiFlyout>
  );
};
