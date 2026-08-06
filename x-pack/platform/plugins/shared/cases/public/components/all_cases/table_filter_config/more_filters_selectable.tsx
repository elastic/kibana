/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { MultiSelectFilterOption } from '../multi_select_filter';
import { MultiSelectFilter } from '../multi_select_filter';

export const MoreFiltersSelectable = ({
  options,
  activeFilters,
  onChange,
  isLoading,
}: {
  options: Array<MultiSelectFilterOption<string>>;
  activeFilters: string[];
  isLoading: boolean;
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <MultiSelectFilter
      // `controlsHorizontal`, not a plus: this control both adds and removes which filters are
      // shown, so "add" describes only half of what it does. The sliders glyph reads as "adjust
      // which controls are here", which is exactly the job.
      buttonIconType="controlsHorizontal"
      hideActiveOptionsNumber
      id="more-filters"
      onChange={onChange}
      options={options}
      selectedOptionKeys={activeFilters}
      isLoading={isLoading}
      // The nudge sits on the anchor, not the button: on the button it moved the button out of
      // alignment with its cell, so the hover and selected backgrounds painted 4px off from the
      // filter group's border. On the anchor, button and background move together.
      anchorCss={css`
        margin-left: -${euiTheme.size.xs};
      `}
    />
  );
};
MoreFiltersSelectable.displayName = 'MoreFiltersSelectable';
