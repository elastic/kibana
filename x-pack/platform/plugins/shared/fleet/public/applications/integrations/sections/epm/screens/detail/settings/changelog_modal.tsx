/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useGetFileByPathQuery, useStartServices } from '../../../../../hooks';
import { useYaml } from '../../../../../../../services';

import { getFormattedChangelog } from '../utils';

export interface ChangeLogParams {
  version: string;
  changes: Array<{
    description: string;
    link: string;
    type: string;
  }>;
}

interface Props {
  latestVersion: string;
  currentVersion?: string;
  packageName: string;
  onClose: () => void;
}

export const ChangelogModal: React.FunctionComponent<Props> = ({
  latestVersion,
  currentVersion,
  packageName,
  onClose,
}) => {
  const { notifications } = useStartServices();
  const yaml = useYaml();

  const {
    data: changelogResponse,
    error: changelogError,
    isLoading,
  } = useGetFileByPathQuery(`/package/${packageName}/${latestVersion}/changelog.yml`);
  const changelogText = changelogResponse?.data;

  // currentVersion is used to display the changelog up to the current installed version, when there is a newer one available
  const finalChangelog = useMemo(() => {
    if (!yaml) return '';
    return currentVersion
      ? getFormattedChangelog(yaml.parse, changelogText, latestVersion, currentVersion)
      : getFormattedChangelog(yaml.parse, changelogText, latestVersion);
  }, [yaml, changelogText, latestVersion, currentVersion]);

  if (changelogError) {
    notifications.toasts.addError(changelogError, {
      title: i18n.translate('xpack.fleet.epm.errorLoadingChangelog', {
        defaultMessage: 'Error loading changelog information',
      }),
    });
  }

  return (
    <EuiModal maxWidth={true} onClose={onClose} data-test-subj="integrations.changelogModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{'Changelog'}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSkeletonText
          lines={10}
          size="s"
          isLoading={isLoading || !yaml}
          contentAriaLabel="changelog text"
        >
          <EuiCodeBlock overflowHeight={360}>{finalChangelog}</EuiCodeBlock>
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
