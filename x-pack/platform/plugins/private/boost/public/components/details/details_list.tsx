/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiDescriptionList, EuiText, EuiTextColor, useEuiTheme } from '@elastic/eui';
import { TitleWithTip } from './title_with_tip';

export interface DetailsListItem {
  title: string;
  /** Shown before the title, such as a swatch of the color it has elsewhere on the page. */
  titlePrepend?: ReactNode;
  /** Explains the title in a tooltip. */
  tip?: string;
  /** Sets the title, and its tooltip's icon, in the disabled text color, such as for a setting with no effect. */
  isDisabled?: boolean;
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
      listItems={items.map(({ title, titlePrepend, tip, isDisabled = false, description }) => ({
        // The tooltip's icon takes the title's color, disabled or not.
        title: (
          <EuiTextColor color={isDisabled ? euiTheme.colors.textDisabled : 'inherit'}>
            {titlePrepend}
            {tip ? <TitleWithTip title={title} tip={tip} /> : title}
          </EuiTextColor>
        ),
        // The compressed list's descriptions are a size smaller than its titles, so they're set
        // to the titles' size.
        description: <EuiText size="s">{description}</EuiText>,
      }))}
    />
  );
};
