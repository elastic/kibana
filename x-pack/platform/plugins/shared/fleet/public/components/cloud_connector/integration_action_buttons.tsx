/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PERMISSION_STATUS_TEST_SUBJECTS } from '../../../common/services/cloud_connectors/test_subjects';

const LEARN_MORE_HREF =
  'https://www.elastic.co/guide/en/fleet/current/cloud-connectors-permission-verification.html';

export const IntegrationActionButtons: React.FC = () => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
    <EuiFlexItem grow={false}>
      <EuiLink
        href={LEARN_MORE_HREF}
        target="_blank"
        external
        data-test-subj={PERMISSION_STATUS_TEST_SUBJECTS.LEARN_MORE_LINK}
      >
        {i18n.translate('xpack.fleet.cloudConnector.permissionStatus.learnMore', {
          defaultMessage: 'Learn more',
        })}
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);
