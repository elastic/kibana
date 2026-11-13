/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import type { MultiSelectFilterOption } from '../multi_select_filter';
import * as i18n from '../translations';
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
  return (
    <MultiSelectFilter
      // `controlsHorizontal`, not a plus: this control both adds and removes which filters are
      // shown, so "add" describes only half of what it does. The sliders glyph reads as "adjust
      // which controls are here", which is exactly the job.
      buttonIconType="controlsHorizontal"
      // An icon-only control with no label had no accessible name at all, and nothing on screen
      // said what it was for — least obvious precisely when no filters are applied yet.
      buttonTooltip={i18n.EDIT_FILTERS_TOOLTIP}
      hideActiveOptionsNumber
      id="more-filters"
      onChange={onChange}
      options={options}
      selectedOptionKeys={activeFilters}
      isLoading={isLoading}
      // No nudge: shifting this control overlapped the neighbouring filter's cell, so hovering one
      // tinted a strip of the other. EuiFilterGroup already collapses the borders between adjacent
      // filters, so each cell owns its own hover area without any offset.
      // EuiFilterButton always renders a label span before its icon, and spaces the icon from it
      // with a margin on the icon itself (not a flex gap). With no label that leaves an empty 8px
      // box and a 4px margin ahead of the glyph, pushing it off-centre in an otherwise symmetrically
      // padded button. Removing both lets the glyph centre. Geometry is deliberately untouched — no
      // width or padding override — so the button keeps its position.
      buttonCss={css`
        & .euiFilterButton__text {
          display: none;
        }

        /* Doubled selector: EUI's own icon-spacing rule is more specific than a single class. */
        && .euiButtonEmpty__content > svg {
          margin-inline-start: 0;
        }
      `}
    />
  );
};
MoreFiltersSelectable.displayName = 'MoreFiltersSelectable';
