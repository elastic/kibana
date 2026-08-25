/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Agent Builder attachment type for an Adaptive UI `ViewSpec` rendered inline in chat. */
export const ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE = 'platform.adaptiveUi.view';

/**
 * Agent Builder renderer type for an Adaptive UI `ViewSpec`. Correlates the
 * server {@link RendererTypeDefinition} with its browser `RendererUIDefinition`
 * (and, once landed, the `<render type="view" />` directive).
 */
export const ADAPTIVE_UI_VIEW_RENDERER_TYPE = 'view';

/** Built-in tool ids registered by this plugin. */
export const adaptiveUiTools = {
  renderView: 'render_view',
  getAuthoringContext: 'get_authoring_context',
  requestRegisteredView: 'request_registered_view',
  postViewToSlack: 'post_view_to_slack',
} as const;

/** Ids of the code-owned views in the Adaptive UI registry. */
export const registeredViewIds = {
  significantEvent: 'streams.significantEvent',
  investigation: 'nightshift.investigation',
} as const;
