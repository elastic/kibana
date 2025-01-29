/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';

import { SECURITY_MODEL, getSecurityModel } from '../../../../../../common/constants';
import { Cluster } from '../../../../../../common/lib/cluster_serialization';

export function SecurityModel({ securityModel }: { securityModel: Cluster['securityModel'] }) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText data-test-subj="authenticationTypeLabel" size="s">
          {getSecurityModel(securityModel)}
        </EuiText>
      </EuiFlexItem>

      {securityModel !== SECURITY_MODEL.API && (
        <EuiFlexItem grow={false} data-test-subj="authenticationTypeWarning">
          <EuiIconTip
            type="iInCircle"
            color="subdued"
            content={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.table.authTypeWarningMessage"
                defaultMessage="If you need more fine-grained permissions on your remote cluster, you can now use API keys instead of certificates as authentication mechanism."
              />
            }
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
