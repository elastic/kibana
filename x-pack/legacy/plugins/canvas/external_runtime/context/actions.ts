/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasWorkpad } from '../types';

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

export const setWorkpad = (workpad: CanvasWorkpad) =>
  createAction(ExternalEmbedActions.SET_WORKPAD, { workpad });

export const setPage = (page: number) => createAction(ExternalEmbedActions.SET_PAGE, { page });

export const setScrubberVisible = (visible: boolean) => {
  return createAction(ExternalEmbedActions.SET_SCRUBBER_VISIBLE, { visible });
};

export const setAutoplay = (autoplay: boolean) =>
  createAction(ExternalEmbedActions.SET_AUTOPLAY, { autoplay });

export const setAutoplayAnimate = (animate: boolean) =>
  createAction(ExternalEmbedActions.SET_AUTOPLAY_ANIMATE, { animate });

export const setAutoplayInterval = (interval: string) =>
  createAction(ExternalEmbedActions.SET_AUTOPLAY_INTERVAL, { interval });

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

export type ExternalEmbedAction = ReturnType<typeof actions[keyof typeof actions]>;
