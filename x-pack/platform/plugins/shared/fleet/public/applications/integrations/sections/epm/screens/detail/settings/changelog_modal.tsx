/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalHeaderTitle,
  EuiButton,
  EuiSkeletonText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { type Changelog, formatChangelog } from '../utils';

interface Props {
  changelog: Changelog;
  isLoading: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FunctionComponent<Props> = ({
  changelog,
  isLoading,
  onClose,
}) => {
  const changelogText = formatChangelog(changelog);

  return (
    <EuiModal maxWidth={true} onClose={onClose} data-test-subj="integrations.changelogModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{'Changelog'}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSkeletonText
          lines={10}
          size="s"
          isLoading={isLoading}
          contentAriaLabel="changelog text"
        >
          <EuiCodeBlock overflowHeight={360}>{changelogText}</EuiCodeBlock>
        </EuiSkeletonText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton color="primary" fill onClick={onClose}>
          <FormattedMessage id="xpack.fleet.epm.changelogModalCloseBtn" defaultMessage="Close" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
