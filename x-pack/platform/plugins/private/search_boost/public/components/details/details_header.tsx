/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import { AppHeader } from '@kbn/app-header';

export interface DetailsParent {
  label: string;
  path: string;
}

interface DetailsHeaderProps {
  title: string;
  parent: DetailsParent;
  badges: AppHeaderBadge[];
}

export const DetailsHeader = ({ title, parent, badges }: DetailsHeaderProps) => {
  const history = useHistory();
  const back = useMemo(
    () => ({ label: parent.label, href: history.createHref({ pathname: parent.path }) }),
    [history, parent.label, parent.path]
  );

  return (
    <>
      <AppHeader title={title} back={back} badges={badges} spacing="bleed" />
      <EuiSpacer size="l" />
    </>
  );
};
