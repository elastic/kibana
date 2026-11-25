/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import { AppHeader } from '@kbn/app-header';
import type { BoostProfileType } from '../../../common/types';
import { PROFILE_TYPE_LABELS } from '../../translations';
import { PageContent } from '../page_content';

export interface DetailsParent {
  label: string;
  path: string;
}

interface DetailsLayoutProps {
  title: string;
  parent: DetailsParent;
  showsHeader: boolean;
  type?: BoostProfileType;
  statusBadge?: string;
  children: ReactNode;
}

/** A rule's or profile's details page: its header and, below it, the page at the standard width. */
export const DetailsLayout = ({
  title,
  parent,
  showsHeader,
  type,
  statusBadge,
  children,
}: DetailsLayoutProps) => {
  const history = useHistory();
  // `AppHeader` is memoized, so its props keep their identity between renders.
  const back = useMemo(
    () => ({ label: parent.label, href: history.createHref({ pathname: parent.path }) }),
    [history, parent.label, parent.path]
  );
  const badges = useMemo(
    (): AppHeaderBadge[] =>
      type
        ? [
            { label: PROFILE_TYPE_LABELS[type] },
            ...(statusBadge ? [{ label: statusBadge, color: 'default' as const }] : []),
          ]
        : [],
    [type, statusBadge]
  );

  return (
    <>
      {showsHeader && (
        <>
          <AppHeader title={title} back={back} badges={badges} spacing="bleed" />
          <EuiSpacer size="l" />
        </>
      )}
      <PageContent>{children}</PageContent>
    </>
  );
};
