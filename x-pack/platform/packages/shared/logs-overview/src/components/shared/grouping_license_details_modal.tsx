/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { GroupingLicenseCtaMessageTrialButtonDependencies } from './grouping_license_cta_shared';
import { GroupingLicenseCtaMessageTrialButton } from './grouping_license_cta_shared';
import type { GroupingPreviewDependencies } from './grouping_preview';
import { GroupingPreview } from './grouping_preview';

export interface GroupingLicenseDetailsModalProps {
  dependencies: GroupingLicenseDetailsModalDependencies;
  isOpen: boolean;
  onClose: () => void;
}

export type GroupingLicenseDetailsModalDependencies =
  GroupingLicenseCtaMessageTrialButtonDependencies & GroupingPreviewDependencies;

export const GroupingLicenseDetailsModal = React.memo<GroupingLicenseDetailsModalProps>(
  ({ dependencies, isOpen, onClose }) => {
    const modalTitleId = useGeneratedHtmlId();

    if (!isOpen) {
      return null;
    }

    return (
      <EuiModal
        aria-labelledby={modalTitleId}
        onClose={onClose}
        data-test-subj="logsOverviewGroupingLicenseDetailsModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>
            {groupingLicenseDetailsModalTitle}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText>
            <p>{groupingLicenseDetailsModalDescription}</p>
            <p>
              <EuiLink
                href={SUBSCRIPTION_URL}
                target="_blank"
                data-test-subj="logsOverviewGroupingLicenseDetailsModalSubscriptionsLink"
              >
                {groupingLicenseDetailsModalSubscriptionsLinkText}
              </EuiLink>
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <GroupingPreview dependencies={dependencies} />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>
                {groupingLicenseDetailsModalCancelButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {GroupingLicenseCtaMessageTrialButton.canRender(dependencies) ? (
              <EuiFlexItem grow={false}>
                <GroupingLicenseCtaMessageTrialButton dependencies={dependencies} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);

const groupingLicenseDetailsModalTitle = i18n.translate(
  'xpack.observabilityLogsOverview.groupingLicenseDetailsModal.title',
  {
    defaultMessage: 'Make sense of your logs, faster',
  }
);

const groupingLicenseDetailsModalDescription = i18n.translate(
  'xpack.observabilityLogsOverview.groupingLicenseDetailsModal.description',
  {
    defaultMessage:
      "Advanced log insights organize your logs into clear, structured patterns so you don't have to sift through endless logs to find important information. Start a free trial to experience the difference.",
  }
);

const groupingLicenseDetailsModalSubscriptionsLinkText = i18n.translate(
  'xpack.observabilityLogsOverview.groupingLicenseDetailsModal.subscriptionsLinkText',
  {
    defaultMessage: 'Explore commercial licenses',
  }
);

const groupingLicenseDetailsModalCancelButtonLabel = i18n.translate(
  'xpack.observabilityLogsOverview.groupingLicenseDetailsModal.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

const SUBSCRIPTION_URL = 'https://www.elastic.co/subscriptions';
