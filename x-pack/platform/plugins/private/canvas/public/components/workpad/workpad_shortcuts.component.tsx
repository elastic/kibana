/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
// @ts-expect-error
import { Shortcuts } from 'react-shortcuts';
import { isTextInput } from '../../lib/is_text_input';
import { Props } from './workpad.component';
import { forceReload } from '../hooks/use_canvas_api';

type ShortcutProps = Pick<
  Props,
  | 'fetchAllRenderables'
  | 'undoHistory'
  | 'redoHistory'
  | 'setGrid'
  | 'grid'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetZoom'
  | 'previousPage'
  | 'nextPage'
  | 'setFullscreen'
  | 'isFullscreen'
>;

type ShortcutFn = () => void;

interface Shortcuts {
  REFRESH: ShortcutFn;
  UNDO: ShortcutFn;
  REDO: ShortcutFn;
  GRID: ShortcutFn;
  ZOOM_IN: ShortcutFn;
  ZOOM_OUT: ShortcutFn;
  ZOOM_RESET: ShortcutFn;
  PREV: ShortcutFn;
  NEXT: ShortcutFn;
  FULLSCREEN: ShortcutFn;
}

export class WorkpadShortcuts extends React.Component<ShortcutProps> {
  _toggleFullscreen = () => {
    const { setFullscreen, isFullscreen } = this.props;
    setFullscreen(!isFullscreen);
  };

  nextPage = () => {
    this.props.nextPage();
  };

  previousPage = () => {
    this.props.previousPage();
  };

  zoomIn = () => {
    this.props.zoomIn();
  };

  zoomOut = () => {
    this.props.zoomOut();
  };

  resetZoom = () => {
    this.props.resetZoom();
  };

  // handle keypress events for editor events
  _keyMap: Shortcuts = {
    REFRESH: () => {
      forceReload();
      this.props.fetchAllRenderables();
    },
    UNDO: this.props.undoHistory,
    REDO: this.props.redoHistory,
    GRID: () => this.props.setGrid(!this.props.grid),
    ZOOM_IN: this.zoomIn,
    ZOOM_OUT: this.zoomOut,
    ZOOM_RESET: this.resetZoom,
    PREV: this.previousPage,
    NEXT: this.nextPage,
    FULLSCREEN: this._toggleFullscreen,
  };

  _keyHandler = (action: keyof Shortcuts, event: KeyboardEvent) => {
    if (
      !isTextInput(event.target as HTMLInputElement) &&
      typeof this._keyMap[action] === 'function'
    ) {
      event.preventDefault();
      this._keyMap[action]();
    }
  };

  render() {
    return <Shortcuts name="EDITOR" handler={this._keyHandler} targetNodeSelector="body" global />;
  }
}
