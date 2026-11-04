/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const HEX_TILE_TOOLTIP_WIDTH = 320;
export const HEX_TILE_TOOLTIP_GAP_PX = 2;
export const HEX_TILE_TOOLTIP_BRIDGE_PX = 20;

export interface HexTileTooltipAnchor {
  readonly anchorCenterX: number;
  readonly tileCenterX: number;
  readonly anchorTop: number;
  readonly anchorBottom: number;
  readonly placeAbove: boolean;
}

export interface HexTileTooltipTransitRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Invisible pointer path from the hovered hex to its portaled tooltip card. */
export const computeHexTileTooltipTransitRect = (
  anchor: HexTileTooltipAnchor,
  tooltipHeight: number
): HexTileTooltipTransitRect => {
  const cardWidth = HEX_TILE_TOOLTIP_WIDTH;
  const halfCard = cardWidth / 2;
  const gap = HEX_TILE_TOOLTIP_GAP_PX;
  const left = Math.min(anchor.tileCenterX, anchor.anchorCenterX) - halfCard;
  const width = Math.abs(anchor.tileCenterX - anchor.anchorCenterX) + cardWidth;
  const tooltipCardTop = anchor.placeAbove
    ? anchor.anchorTop - gap - tooltipHeight
    : anchor.anchorBottom + gap;
  const top = anchor.placeAbove
    ? tooltipCardTop - HEX_TILE_TOOLTIP_BRIDGE_PX
    : anchor.anchorBottom;
  const height = anchor.placeAbove
    ? tooltipHeight + gap + HEX_TILE_TOOLTIP_BRIDGE_PX + 8
    : gap + HEX_TILE_TOOLTIP_BRIDGE_PX + 12;

  return { left, top, width, height };
};

export const rectsIntersect = (
  a: HexTileTooltipTransitRect | DOMRect,
  b: DOMRect
): boolean => {
  const aRight = a.left + a.width;
  const aBottom = a.top + a.height;
  return !(aRight < b.left || a.left > b.right || aBottom < b.top || a.top > b.bottom);
};
