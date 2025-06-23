/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModal, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface GroupingLicenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupingLicenseDetailsModal = React.memo<GroupingLicenseDetailsModalProps>(
  ({ isOpen, onClose }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <EuiModal onClose={onClose} data-test-subj="logsOverviewGroupingLicenseDetailsModal">
        <EuiModalHeader>
          <EuiModalHeaderTitle>{groupingLicenseDetailsModalTitle}</EuiModalHeaderTitle>
        </EuiModalHeader>
      </EuiModal>
    );
  }
);

const groupingLicenseDetailsModalTitle = i18n.translate(
  'xpack.logsOverview.groupingLicenseDetailsModal.title',
  {
    defaultMessage: 'Make sense of your logs faster',
  }
);
