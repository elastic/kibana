/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { EuiDescriptionList, EuiHorizontalRule, EuiPanel, EuiTitle } from '@elastic/eui';

export interface AboutCardItem {
  title: string;
  description: NonNullable<ReactNode>;
}

interface AboutCardProps {
  title: string;
  items: AboutCardItem[];
  'data-test-subj'?: string;
  titleExtra?: ReactNode;
}

const titleExtraWrapperCss = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const AboutCardComponent: React.FC<AboutCardProps> = ({
  title,
  items,
  'data-test-subj': dataTestSubj,
  titleExtra,
}) => {
  const listItems = useMemo(
    () => items.map((item) => ({ title: item.title, description: item.description })),
    [items]
  );

  return (
    <EuiPanel hasBorder data-test-subj={dataTestSubj}>
      {titleExtra ? (
        <div css={titleExtraWrapperCss}>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
          {titleExtra}
        </div>
      ) : (
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      )}
      <EuiHorizontalRule margin="s" />
      <EuiDescriptionList type="column" compressed listItems={listItems} />
    </EuiPanel>
  );
};

export const AboutCard = React.memo(AboutCardComponent);
