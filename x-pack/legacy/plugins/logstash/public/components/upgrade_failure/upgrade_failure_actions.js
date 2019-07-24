/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function UpgradeFailureActions({ onClose, onRetry, upgradeButtonText }) {
  return (
    <EuiFlexGroup justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <EuiButton fill onClick={onRetry}>
          {upgradeButtonText}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty color="primary" onClick={onClose}>
          <FormattedMessage
            id="xpack.logstash.upgradeFailureActions.goBackButtonLabel"
            defaultMessage="Go back"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

UpgradeFailureActions.propTypes = {
  onClose: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  upgradeButtonText: PropTypes.string.isRequired,
};
