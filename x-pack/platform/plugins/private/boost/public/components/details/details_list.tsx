/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiDescriptionList, EuiIconTip, EuiText, useEuiTheme } from '@elastic/eui';

export interface DetailsListItem {
  title: string;
  /** Explains the title in a tooltip. */
  tip?: string;
  description: NonNullable<ReactNode>;
}

/** Labeled values on a details page, beside each other on wide screens and stacked on narrow ones. */
export const DetailsList = ({ items }: { items: readonly DetailsListItem[] }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiDescriptionList
      type="responsiveColumn"
      compressed
      columnWidths={[2, 3]}
      rowGutterSize="m"
      listItems={items.map(({ title, tip, description }) => ({
        title: tip ? (
          <span css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.xs }}>
            {title}
            <EuiIconTip type="info" color="subdued" content={tip} aria-label={title} />
          </span>
        ) : (
          title
        ),
        // The compressed list's descriptions are a size smaller than its titles, so they're set
        // to the titles' size.
        description: <EuiText size="s">{description}</EuiText>,
      }))}
    />
  );
};
