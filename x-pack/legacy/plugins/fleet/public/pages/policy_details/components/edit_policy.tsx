/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
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
import { PolicyForm } from '../../../components/policy_form';
import { Policy } from '../../../../scripts/mock_spec/types';

interface RouterProps {
  policy: Policy;
  onClose: () => void;
}

export const EditPolicyFlyout: React.FC<RouterProps> = ({ policy, onClose }) => {
  const renderHeader = () => (
    <EuiFlyoutHeader hasBorder aria-labelledby="FleetEditPolicyFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="FleetEditPolicyFlyoutTitle">
          <FormattedMessage id="xpack.fleet.editPolicy.flyoutTitle" defaultMessage="Edit policy" />
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );

  const renderBody = () => (
    <EuiFlyoutBody>
      <PolicyForm
        policy={policy}
        onCancel={onClose}
        onSubmit={() => {
          // TODO: add create here
          onClose();
        }}
      />
    </EuiFlyoutBody>
  );

  const renderFooter = () => (
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
          <EuiButton fill onClick={onClose}>
            <FormattedMessage
              id="xpack.fleet.editPolicy.submitButtonLabel"
              defaultMessage="Continue"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <EuiFlyout onClose={onClose} size="m" maxWidth={400}>
      {renderHeader()}
      {renderBody()}
      {renderFooter()}
    </EuiFlyout>
  );
};
