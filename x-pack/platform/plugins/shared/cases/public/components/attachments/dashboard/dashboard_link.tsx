/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { useDashboardMetadata, type DashboardMetadata } from './use_dashboard_metadata';
import { getDashboardUrl } from './utils';

interface DashboardLinkProps {
  attachmentId: string;
  title?: string;
  inAppUrl?: string;
  'data-test-subj'?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Component that renders a link to a dashboard.
 * If title and inAppUrl are provided, uses them directly.
 * Otherwise, fetches metadata using the attachmentId.
 */
export const DashboardLink = ({
  attachmentId,
  title: providedTitle,
  inAppUrl: providedInAppUrl,
  'data-test-subj': dataTestSubj,
  onClick: providedOnClick,
}: DashboardLinkProps) => {
  const { application, http } = useKibana().services;

  // Always call the hook, but only use it if metadata isn't provided
  const shouldFetchMetadata = providedTitle === undefined && providedInAppUrl === undefined;
  const idToFetch = useMemo(() => {
    return shouldFetchMetadata ? [attachmentId] : [];
  }, [attachmentId, shouldFetchMetadata]);
  const { metadata, isLoading } = useDashboardMetadata(idToFetch);

  const key = `dashboard:${attachmentId}`;
  const fetchedMetadata: DashboardMetadata | undefined = shouldFetchMetadata
    ? metadata[key]
    : undefined;

  // Determine title and URL - prefer provided values, fall back to fetched metadata, then attachmentId
  const title = providedTitle ?? fetchedMetadata?.title ?? attachmentId;
  const inAppUrl = providedInAppUrl ?? fetchedMetadata?.inAppUrl?.path;
  const url = getDashboardUrl(attachmentId, inAppUrl);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (providedOnClick) {
      providedOnClick(e);
    } else {
      application.navigateToUrl(http.basePath.prepend(url));
    }
  };

  // Show link with title (will update when metadata loads if fetching)
  return isLoading ? (
    <EuiLoadingSpinner />
  ) : (
    <EuiLink
      href={http.basePath.prepend(url)}
      onClick={handleClick}
      data-test-subj={dataTestSubj ?? `dashboard-link-${attachmentId}`}
    >
      {title}
    </EuiLink>
  );
};

DashboardLink.displayName = 'DashboardLink';
