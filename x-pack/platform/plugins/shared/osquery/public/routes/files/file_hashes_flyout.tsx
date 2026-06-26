/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiDescriptionList,
  EuiCode,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFileHashes } from './use_file_hashes';

interface FileHashesFlyoutProps {
  agentId: string;
  path: string;
  onClose: () => void;
}

export const FileHashesFlyout: React.FC<FileHashesFlyoutProps> = ({ agentId, path, onClose }) => {
  const { hashes, isLoading, isError } = useFileHashes({ agentId, path, enabled: true });

  const hashListItems = useMemo<EuiDescriptionListProps['listItems']>(
    () =>
      hashes
        ? [
            {
              title: 'MD5',
              description: <EuiCode>{hashes.md5 || '—'}</EuiCode>,
            },
            {
              title: 'SHA-1',
              description: <EuiCode>{hashes.sha1 || '—'}</EuiCode>,
            },
            {
              title: 'SHA-256',
              description: <EuiCode>{hashes.sha256 || '—'}</EuiCode>,
            },
          ]
        : [],
    [hashes]
  );

  return (
    <EuiFlyout onClose={onClose} size="s" data-test-subj="fileHashesFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.osquery.fileSystem.hashes.flyoutTitle"
              defaultMessage="File hashes"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <EuiCode>{path}</EuiCode>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isLoading && <EuiLoadingSpinner size="m" data-test-subj="fileHashesLoading" />}

        {!isLoading && isError && (
          <EuiCallOut
            color="danger"
            iconType="warning"
            title={
              <FormattedMessage
                id="xpack.osquery.fileSystem.hashes.errorTitle"
                defaultMessage="Could not compute file hashes"
              />
            }
            data-test-subj="fileHashesError"
          >
            <FormattedMessage
              id="xpack.osquery.fileSystem.hashes.errorBody"
              defaultMessage="The host may be offline or the Osquery agent unavailable."
            />
          </EuiCallOut>
        )}

        {!isLoading && !isError && !hashes && (
          <EuiText size="s" color="subdued" data-test-subj="fileHashesEmpty">
            <FormattedMessage
              id="xpack.osquery.fileSystem.hashes.noResults"
              defaultMessage="No hash data returned. The file may not exist on this host."
            />
          </EuiText>
        )}

        {!isLoading && !isError && hashes && (
          <EuiDescriptionList data-test-subj="fileHashesList" listItems={hashListItems} />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
