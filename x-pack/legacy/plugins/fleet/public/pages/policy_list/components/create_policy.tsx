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

interface RouterProps {
  onClose: () => void;
}

export const CreatePolicyFlyout: React.SFC<RouterProps> = ({ onClose }) => {
  const renderHeader = () => (
    <EuiFlyoutHeader hasBorder aria-labelledby="FleetCreatePolicyFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="FleetCreatePolicyFlyoutTitle">
          <FormattedMessage
            id="xpack.fleet.createPolicy.flyoutTitle"
            defaultMessage="Create new policy"
          />
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );

  const renderBody = () => (
    <EuiFlyoutBody>
      <PolicyForm
        policy={{ name: '', description: '' }}
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
              id="xpack.fleet.createPolicy.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onClose}>
            <FormattedMessage
              id="xpack.fleet.createPolicy.submitButtonLabel"
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
