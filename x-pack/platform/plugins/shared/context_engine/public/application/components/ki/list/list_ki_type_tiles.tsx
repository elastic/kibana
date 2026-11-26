/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonRectangle, EuiToolTip } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import { kiLabelCapitalizeCss } from '../shared/ki_type_display';
import type { ListKiTileSelection } from './list_ki_groups_helpers';
import { hasTileSelection } from './list_ki_groups_helpers';
import {
  getTileGrow,
  getTileWidthCount,
  isTileSelected,
  type ListKiTile,
} from './list_ki_tiles_helpers';
import {
  TILE_GROW_VAR,
  TILE_STRIP_HEIGHT,
  useListKiTypeTilesStyles,
} from './list_ki_type_tiles_styles';

interface ListKiTypeTilesProps {
  tiles: ListKiTile[];
  /** Documents that match the status and search filters. */
  total: number;
  selection: ListKiTileSelection;
  onToggleTile: (tile: ListKiTile) => void;
  isLoading: boolean;
}

const stripLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.tilesLabel', {
  defaultMessage: 'Knowledge documents by type',
});

/** One tile per biggest type plus "Other". A tile click shows only the selected sections. */
export const ListKiTypeTiles = ({
  tiles,
  total,
  selection,
  onToggleTile,
  isLoading,
}: ListKiTypeTilesProps) => {
  const styles = useListKiTypeTilesStyles();

  if (isLoading && tiles.length === 0) {
    return (
      <EuiSkeletonRectangle
        width="100%"
        height={TILE_STRIP_HEIGHT}
        css={styles.skeleton}
        data-test-subj="contextListKiTilesLoading"
      />
    );
  }

  if (tiles.length === 0) {
    return null;
  }

  const anySelected = hasTileSelection(selection);

  return (
    <div css={styles.container}>
      <div
        role="group"
        aria-label={stripLabel}
        css={styles.strip}
        data-test-subj="contextListKiTiles"
      >
        {tiles.map((tile) => {
          const isSelected = isTileSelected(tile, selection);
          const colors =
            tile.colorIndex === undefined ? styles.otherColors : styles.typeColors[tile.colorIndex];
          const tooltip = (
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.listKi.tileTooltip"
              defaultMessage="{label}: {count} of {total}"
              values={{
                label: (
                  <span css={tile.kind === 'type' ? kiLabelCapitalizeCss : undefined}>
                    {tile.label}
                  </span>
                ),
                count: tile.count,
                total,
              }}
            />
          );
          return (
            <EuiToolTip
              key={tile.key}
              content={tooltip}
              // Below the tile, so it does not cover the header row.
              position="bottom"
              display="block"
              // The width follows the count, a runtime value. A CSS variable (not `flexGrow`), so
              // the compact layout on a narrow strip can ignore it.
              anchorProps={{
                css: styles.tileAnchor,
                // The count without the search, so the tiles do not jump while the user types.
                style: {
                  [TILE_GROW_VAR]: getTileGrow(getTileWidthCount(tile, tiles)),
                } as React.CSSProperties,
              }}
            >
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggleTile(tile)}
                css={[
                  styles.tile,
                  colors,
                  isSelected && styles.selected,
                  anySelected && !isSelected && styles.dimmed,
                  // No match for the search: faded, but still clickable.
                  tile.count === 0 && !isSelected && styles.noMatch,
                ]}
                data-test-subj={
                  tile.kind === 'other'
                    ? 'contextListKiTileOther'
                    : `contextListKiTile-${tile.type}`
                }
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.listKi.FILTER_TYPE,
                })}
              >
                <span css={[styles.name, tile.kind === 'type' && kiLabelCapitalizeCss]}>
                  {tile.label}
                </span>
                <span css={styles.count} data-test-subj="contextListKiTileCount">
                  {tile.count}
                </span>
              </button>
            </EuiToolTip>
          );
        })}
      </div>
    </div>
  );
};
