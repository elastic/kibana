/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import Style from 'style-it';
import { WorkpadPage } from '../workpad_page';
import { Fullscreen } from '../fullscreen';
import { isTextInput } from '../../lib/is_text_input';
import { WORKPAD_CANVAS_BUFFER } from '../../../common/lib/constants';

export class Workpad extends React.PureComponent {
  static propTypes = {
    selectedPageNumber: PropTypes.number.isRequired,
    getAnimation: PropTypes.func.isRequired,
    onTransitionEnd: PropTypes.func.isRequired,
    grid: PropTypes.bool.isRequired,
    setGrid: PropTypes.func.isRequired,
    pages: PropTypes.array.isRequired,
    totalElementCount: PropTypes.number.isRequired,
    isFullscreen: PropTypes.bool.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    workpadCss: PropTypes.string.isRequired,
    undoHistory: PropTypes.func.isRequired,
    redoHistory: PropTypes.func.isRequired,
    nextPage: PropTypes.func.isRequired,
    previousPage: PropTypes.func.isRequired,
    fetchAllRenderables: PropTypes.func.isRequired,
    registerLayout: PropTypes.func.isRequired,
    unregisterLayout: PropTypes.func.isRequired,
    zoomIn: PropTypes.func.isRequired,
    zoomOut: PropTypes.func.isRequired,
    resetZoom: PropTypes.func.isRequired,
  };

  _toggleFullscreen = () => {
    const { setFullscreen, isFullscreen } = this.props;
    setFullscreen(!isFullscreen);
  };

  // handle keypress events for editor events
  _keyMap = {
    REFRESH: this.props.fetchAllRenderables,
    UNDO: this.props.undoHistory,
    REDO: this.props.redoHistory,
    GRID: () => this.props.setGrid(!this.props.grid),
    ZOOM_IN: this.props.zoomIn,
    ZOOM_OUT: this.props.zoomOut,
    ZOOM_RESET: this.props.resetZoom,
    PREV: this.props.previousPage,
    NEXT: this.props.nextPage,
    FULLSCREEN: this._toggleFullscreen,
  };

  _keyHandler = (action, event) => {
    if (!isTextInput(event.target) && typeof this._keyMap[action] === 'function') {
      event.preventDefault();
      this._keyMap[action]();
    }
  };

  render() {
    const {
      selectedPageNumber,
      getAnimation,
      onTransitionEnd,
      pages,
      totalElementCount,
      width,
      height,
      workpadCss,
      grid,
      isFullscreen,
      registerLayout,
      unregisterLayout,
      zoomScale,
    } = this.props;

    const bufferStyle = {
      height: isFullscreen ? height : (height + 2 * WORKPAD_CANVAS_BUFFER) * zoomScale,
      width: isFullscreen ? width : (width + 2 * WORKPAD_CANVAS_BUFFER) * zoomScale,
    };

    return (
      <div className="canvasWorkpad__buffer" style={bufferStyle}>
        <div
          className="canvasCheckered"
          style={{
            height,
            width,
            transformOrigin: '0 0',
            transform: isFullscreen ? undefined : `scale3d(${zoomScale}, ${zoomScale}, 1)`, // don't scale in fullscreen mode
          }}
        >
          {!isFullscreen && (
            <Shortcuts name="EDITOR" handler={this._keyHandler} targetNodeSelector="body" global />
          )}

          <Fullscreen>
            {({ isFullscreen, windowSize }) => {
              const scale = Math.min(windowSize.height / height, windowSize.width / width);
              const fsStyle = isFullscreen
                ? {
                    transform: `scale3d(${scale}, ${scale}, 1)`,
                    WebkitTransform: `scale3d(${scale}, ${scale}, 1)`,
                    msTransform: `scale3d(${scale}, ${scale}, 1)`,
                    height: windowSize.height < height ? 'auto' : height,
                    width: windowSize.width < width ? 'auto' : width,
                  }
                : {};

              // NOTE: the data-shared-* attributes here are used for reporting
              return Style.it(
                workpadCss,
                <div
                  className={`canvasWorkpad ${isFullscreen ? 'fullscreen' : ''}`}
                  style={fsStyle}
                  data-shared-items-count={totalElementCount}
                >
                  {isFullscreen && (
                    <Shortcuts
                      name="PRESENTATION"
                      handler={this.keyHandler}
                      targetNodeSelector="body"
                      global
                    />
                  )}
                  {pages.map((page, i) => (
                    <WorkpadPage
                      key={page.id}
                      pageId={page.id}
                      height={height}
                      width={width}
                      isSelected={i + 1 === selectedPageNumber}
                      animation={getAnimation(i + 1)}
                      onAnimationEnd={onTransitionEnd}
                      registerLayout={registerLayout}
                      unregisterLayout={unregisterLayout}
                    />
                  ))}
                  <div
                    className="canvasGrid"
                    style={{ height, width, display: grid ? 'block' : 'none' }}
                  />
                </div>
              );
            }}
          </Fullscreen>
        </div>
      </div>
    );
  }
}
