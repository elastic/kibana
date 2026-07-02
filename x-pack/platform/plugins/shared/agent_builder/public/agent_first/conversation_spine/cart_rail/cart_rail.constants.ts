/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Fixed width of the pinned-items rail in push mode (mirrors Agent Builder sidebar). */
export const CART_RAIL_WIDTH = 300;

/** Agent panel width above which the cart rail uses a percentage width in push mode. */
export const AGENT_PANEL_CART_WIDE_AT_WIDTH = 1000;

/** Push-mode cart rail width when the agent panel is wider than {@link AGENT_PANEL_CART_WIDE_AT_WIDTH}. */
export const CART_RAIL_WIDE_WIDTH = '30%';

/** Max height for the cart rail when shown in popover mode. */
export const CART_RAIL_POPOVER_MAX_HEIGHT = 'min(80vh, 720px)';

/** Agent panel width below which the cart rail uses popover instead of push layout. */
export const AGENT_PANEL_CART_POPOVER_AT_WIDTH = 640;
