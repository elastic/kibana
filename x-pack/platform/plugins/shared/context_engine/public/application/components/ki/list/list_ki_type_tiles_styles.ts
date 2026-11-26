/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

/** The only height value of the strip, so a smaller design is a one-line change. */
export const TILE_STRIP_HEIGHT = '120px';
const TILE_MIN_WIDTH = '96px';
const TILE_BAR_WIDTH = '4px';
const TILE_BACKGROUND_ALPHA = 0.15;
/** Each tile sets its colors here, so the shared selected style can use them. */
const TILE_BAR_COLOR_VAR = '--kbnContextKiTileBarColor';
const TILE_STRONG_BG_VAR = '--kbnContextKiTileStrongBackground';
const TILE_BAR_WIDTH_SELECTED = '6px';
const TILE_STRONG_BACKGROUND_ALPHA = 0.35;
/** Each tile sets its width weight here (runtime value), so the compact layout can ignore it. */
export const TILE_GROW_VAR = '--kbnContextKiTileGrow';
const barShadow = `inset ${TILE_BAR_WIDTH} 0 0 var(${TILE_BAR_COLOR_VAR})`;
/**
 * Below this strip width six tiles at their min width do not fit: the tiles turn compact
 * (name and count on one line) and wrap into rows.
 */
const COMPACT_STRIP_MAX_WIDTH = '640px';
const compact = `@container (max-width: ${COMPACT_STRIP_MAX_WIDTH})`;

export const useListKiTypeTilesStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const { vis } = euiTheme.colors;
    // Borealis has no light vis pairs: the background is the vis color, made transparent.
    const visColors = [
      vis.euiColorVis0,
      vis.euiColorVis1,
      vis.euiColorVis2,
      vis.euiColorVis3,
      vis.euiColorVis4,
      vis.euiColorVis5,
      vis.euiColorVis6,
      vis.euiColorVis7,
      vis.euiColorVis8,
      vis.euiColorVis9,
    ];

    const tileColors = (barColor: string, backgroundColor: string, strongBackground: string) =>
      css({
        backgroundColor,
        [TILE_BAR_COLOR_VAR]: barColor,
        [TILE_STRONG_BG_VAR]: strongBackground,
      });

    return {
      // The strip measures its own width (container query), not the window.
      container: css({
        containerType: 'inline-size',
        marginBottom: euiTheme.size.base,
      }),
      strip: css({
        display: 'flex',
        alignItems: 'stretch',
        gap: euiTheme.size.xs,
        height: TILE_STRIP_HEIGHT,
        [compact]: {
          flexWrap: 'wrap',
          height: 'auto',
        },
      }),
      // The tooltip anchor is the flex item; the button fills it.
      tileAnchor: css({
        display: 'flex',
        // `flex` shorthand: grow from the CSS variable, shrink, start from 0 width.
        flex: `var(${TILE_GROW_VAR}, 1) 1 0`,
        minWidth: TILE_MIN_WIDTH,
        [compact]: {
          flex: '1 1 auto',
        },
      }),
      tile: css({
        position: 'relative',
        flexGrow: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: euiTheme.size.xs,
        padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
        border: 'none',
        borderRadius: 0,
        color: euiTheme.colors.textHeading,
        textAlign: 'start',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: barShadow,
        transition: `opacity ${euiTheme.animation.fast}`,
        '&:focus-visible': {
          outline: `${euiTheme.focus.width} solid ${euiTheme.focus.color}`,
          outlineOffset: euiTheme.focus.width,
        },
        [compact]: {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: euiTheme.size.s,
          padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
        },
      }),
      // A ring, a stronger background and a wider bar: the ring shows the state without color
      // (WCAG 1.4.1). It is a box-shadow, not an outline: EUI removes the outline of a button
      // that keeps focus after a click, so an outline ring got lost on the last clicked tile.
      // The bar comes first, so it is drawn over the ring.
      selected: css({
        backgroundColor: `var(${TILE_STRONG_BG_VAR})`,
        boxShadow: [
          `inset ${TILE_BAR_WIDTH_SELECTED} 0 0 var(${TILE_BAR_COLOR_VAR})`,
          `inset 0 0 0 ${euiTheme.border.width.thick} ${euiTheme.colors.borderStrongText}`,
        ].join(', '),
      }),
      dimmed: css({
        opacity: 0.5,
      }),
      noMatch: css({
        opacity: 0.4,
      }),
      name: css({
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: euiTheme.font.scale.s * euiTheme.base,
      }),
      count: css({
        fontSize: euiTheme.font.scale.l * euiTheme.base,
        fontWeight: euiTheme.font.weight.semiBold,
        lineHeight: 1,
        [compact]: {
          fontSize: euiTheme.font.scale.m * euiTheme.base,
        },
      }),
      typeColors: visColors.map((color) =>
        tileColors(
          color,
          transparentize(color, TILE_BACKGROUND_ALPHA),
          transparentize(color, TILE_STRONG_BACKGROUND_ALPHA)
        )
      ),
      otherColors: tileColors(
        euiTheme.colors.textSubdued,
        euiTheme.colors.backgroundBaseSubdued,
        euiTheme.colors.backgroundBaseDisabled
      ),
      skeleton: css({
        height: TILE_STRIP_HEIGHT,
        marginBottom: euiTheme.size.base,
      }),
    };
  }, [euiTheme]);
};
