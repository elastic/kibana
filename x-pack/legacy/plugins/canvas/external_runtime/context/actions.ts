/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasRenderedWorkpad } from '../types';

/**
 * This enumeration applies a strong type to all of the actions that can be
 * triggered from the interface.
 */
export enum ExternalEmbedActions {
  SET_WORKPAD = 'SET_WORKPAD',
  SET_PAGE = 'SET_PAGE',
  SET_SCRUBBER_VISIBLE = 'SET_SCRUBBER_VISIBLE',
  SET_AUTOPLAY = 'SET_AUTOPLAY',
  SET_AUTOPLAY_ANIMATE = 'SET_AUTOPLAY_ANIMATE',
  SET_AUTOPLAY_INTERVAL = 'SET_AUTOPLAY_INTERVAL',
  SET_TOOLBAR_AUTOHIDE = 'SET_TOOLBAR_AUTOHIDE',
}

interface FluxAction<T, P> {
  type: T;
  payload: P;
}

const createAction = <T extends ExternalEmbedActions, P>(
  type: T,
  payload: P
): FluxAction<T, P> => ({
  type,
  payload,
});

/**
 * Set the current `CanvasRenderedWorkpad`.
 * @param workpad A `CanvasRenderedWorkpad` to display.
 */
export const setWorkpad = (workpad: CanvasRenderedWorkpad) =>
  createAction(ExternalEmbedActions.SET_WORKPAD, { workpad });

/**
 * Set the current page to display
 * @param page The zero-indexed page to display.
 */
export const setPage = (page: number) => createAction(ExternalEmbedActions.SET_PAGE, { page });

/**
 * Set the visibility of the page scrubber.
 * @param visible True if it should be visible, false otherwise.
 */
export const setScrubberVisible = (visible: boolean) => {
  return createAction(ExternalEmbedActions.SET_SCRUBBER_VISIBLE, { visible });
};

/**
 * Set whether the slides should automatically advance.
 * @param autoplay True if it should automatically advance, false otherwise.
 */
export const setAutoplay = (autoplay: boolean) =>
  createAction(ExternalEmbedActions.SET_AUTOPLAY, { autoplay });

/**
 * Set whether the slides should animate when advanced.
 * @param animate True if it should animate when advanced, false otherwise.
 */
export const setAutoplayAnimate = (animate: boolean) =>
  createAction(ExternalEmbedActions.SET_AUTOPLAY_ANIMATE, { animate });

/**
 * Set the interval in which slide will advance.  This is a `string` identical to
 * that used in Canvas proper: `1m`, `2s`, etc.
 * @param autoplay The interval in which slides should advance.
 */
export const setAutoplayInterval = (interval: string) =>
  createAction(ExternalEmbedActions.SET_AUTOPLAY_INTERVAL, { interval });

/**
 * Set if the toolbar should be hidden if the mouse is not within the bounds of the
 * embedded workpad.
 * @param autohide True if the toolbar should hide, false otherwise.
 */
export const setToolbarAutohide = (autohide: boolean) =>
  createAction(ExternalEmbedActions.SET_TOOLBAR_AUTOHIDE, { autohide });

const actions = {
  setWorkpad,
  setPage,
  setScrubberVisible,
  setAutoplay,
  setAutoplayAnimate,
  setAutoplayInterval,
  setToolbarAutohide,
};

/**
 * Strongly-types the correlation between an `action` and its return.
 */
export type ExternalEmbedAction = ReturnType<typeof actions[keyof typeof actions]>;
