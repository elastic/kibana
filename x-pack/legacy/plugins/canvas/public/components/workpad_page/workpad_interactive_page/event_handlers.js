/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const localMousePosition = (canvasOrigin, clientX, clientY, zoomScale = 1) => {
  const { left, top } = canvasOrigin();
  return {
    // commit unscaled coordinates
    x: (clientX - left) / zoomScale,
    y: (clientY - top) / zoomScale,
  };
};

const resetHandler = () => {
  window.onmousemove = null;
  window.onmouseup = null;
};

const setupHandler = (commit, canvasOrigin, zoomScale) => {
  // Ancestor has to be identified on setup, rather than 1st interaction, otherwise events may be triggered on
  // DOM elements that had been removed: kibana-canvas github issue #1093

  window.onmousemove = ({ buttons, clientX, clientY, altKey, metaKey, shiftKey, ctrlKey }) => {
    const { x, y } = localMousePosition(canvasOrigin, clientX, clientY, zoomScale);
    // only commits the cursor position if there's a way to latch onto x/y calculation (canvasOrigin is knowable)
    // or if left button is being held down (i.e. an element is being dragged)
    if (buttons === 1 || canvasOrigin) {
      commit('cursorPosition', { x, y, altKey, metaKey, shiftKey, ctrlKey });
    } else {
      // clears cursorPosition
      commit('cursorPosition', {});
    }
  };
  window.onmouseup = e => {
    e.stopPropagation();
    const { clientX, clientY, altKey, metaKey, shiftKey, ctrlKey } = e;
    const { x, y } = localMousePosition(canvasOrigin, clientX, clientY, zoomScale);
    commit('mouseEvent', { event: 'mouseUp', x, y, altKey, metaKey, shiftKey, ctrlKey });
    resetHandler();
  };
};

const handleMouseMove = (
  commit,
  { clientX, clientY, altKey, metaKey, shiftKey, ctrlKey },
  canvasOrigin,
  zoomScale
) => {
  const { x, y } = localMousePosition(canvasOrigin, clientX, clientY, zoomScale);
  if (commit) {
    commit('cursorPosition', { x, y, altKey, metaKey, shiftKey, ctrlKey });
  }
};

const handleMouseLeave = (commit, { buttons }) => {
  if (buttons !== 1 && commit) {
    commit('cursorPosition', {}); // reset hover only if we're not holding down left key (ie. drag in progress)
  }
};

const handleMouseDown = (commit, e, canvasOrigin, zoomScale, allowDrag = true) => {
  e.stopPropagation();
  const { clientX, clientY, buttons, altKey, metaKey, shiftKey, ctrlKey } = e;
  if (buttons !== 1 || !commit) {
    resetHandler();
    return; // left-click only
  }

  if (allowDrag) {
    setupHandler(commit, canvasOrigin, zoomScale);
  }

  const { x, y } = localMousePosition(canvasOrigin, clientX, clientY, zoomScale);
  commit('mouseEvent', { event: 'mouseDown', x, y, altKey, metaKey, shiftKey, ctrlKey });

  if (!allowDrag) {
    commit('mouseEvent', { event: 'mouseUp', x, y, altKey, metaKey, shiftKey, ctrlKey });
  }
};

export const eventHandlers = {
  onMouseDown: props => e =>
    handleMouseDown(
      props.commit,
      e,
      props.canvasOrigin,
      props.zoomScale,
      props.canDragElement(e.target)
    ),
  onMouseMove: props => e => handleMouseMove(props.commit, e, props.canvasOrigin, props.zoomScale),
  onMouseLeave: props => e => handleMouseLeave(props.commit, e),
  onWheel: props => e => handleMouseMove(props.commit, e, props.canvasOrigin),
  resetHandler: () => () => resetHandler(),
};
