/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FrozenDefaultRepositoryRequiredCallout } from '../../../common/data_lifecycle/frozen_default_repository_required_callout';

export interface DlmSearchableSnapshotInfoSectionProps {
  dataTestSubj: string;
  manageRepositoriesHref?: string;
  defaultRepositoryName?: string;
  onCreateDefaultRepository?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DlmSearchableSnapshotInfoSection = ({
  dataTestSubj,
  manageRepositoriesHref,
  defaultRepositoryName,
  onCreateDefaultRepository,
  onRefresh,
  isRefreshing,
}: DlmSearchableSnapshotInfoSectionProps) => {
  const titleId = useGeneratedHtmlId({ prefix: `${dataTestSubj}DlmSearchableSnapshotTitle` });

  const manageLink = (chunks: React.ReactNode) =>
    manageRepositoriesHref ? (
      <EuiLink href={manageRepositoriesHref}>{chunks}</EuiLink>
    ) : (
      <>{chunks}</>
    );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj={`${dataTestSubj}DlmSearchableSnapshotInfo`}
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h3 id={titleId}>
                  {i18n.translate('xpack.streams.editDlmPhasesFlyout.searchableSnapshotTitle', {
                    defaultMessage: 'Searchable snapshot',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {defaultRepositoryName ? (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.streams.editDlmPhasesFlyout.searchableSnapshotBody"
            defaultMessage="All streams using a data stream lifecycle use the deployment's default snapshot repository, ‘{defaultRepository}’. To change the default repository, <manageLink>manage your repositories</manageLink>."
            values={{
              defaultRepository: defaultRepositoryName,
              manageLink,
            }}
          />
        </EuiText>
      ) : (
        <FrozenDefaultRepositoryRequiredCallout
          onCreateDefaultRepository={onCreateDefaultRepository}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          calloutTestSubj={`${dataTestSubj}FrozenDefaultRepositoryRequiredCallout`}
          createButtonTestSubj={`${dataTestSubj}CreateDefaultRepositoryButton`}
          refreshButtonTestSubj={`${dataTestSubj}RefreshDefaultRepositoryButton`}
        />
      )}
    </EuiFlexGroup>
  );
};
