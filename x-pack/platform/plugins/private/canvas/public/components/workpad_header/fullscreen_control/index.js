/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useCallback } from 'react';
import { connect, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { withState, withProps, withHandlers, compose, getContext } from 'react-recompose';
import { selectToplevelNodes } from '../../../state/actions/transient';
import { getSelectedPageIndex, getPages, getWorkpad } from '../../../state/selectors/workpad';
import { trackCanvasUiMetric, METRIC_TYPE } from '../../../lib/ui_metric';
import {
  LAUNCHED_FULLSCREEN,
  LAUNCHED_FULLSCREEN_AUTOPLAY,
} from '../../../../common/lib/constants';
import { transitionsRegistry } from '../../../lib/transitions_registry';
import { fetchAllRenderables } from '../../../state/actions/elements';
import { WorkpadRoutingContext } from '../../../routes/workpad/workpad_routing_context';
import { FullscreenControl as Component } from './fullscreen_control';

// TODO: a lot of this is borrowed code from `/components/workpad/index.js`.
// We should consider extracting the next/prev page logic into to a shared lib file.
const mapStateToProps = (state) => ({
  workpadId: getWorkpad(state).id,
  pages: getPages(state),
  selectedPageNumber: getSelectedPageIndex(state) + 1,
});

const mapDispatchToProps = (dispatch) => ({
  fetchAllRenderables: () => dispatch(fetchAllRenderables()),
});

export const FullscreenControlWithContext = (props) => {
  const {
    isFullscreen,
    autoplayInterval,
    nextPage,
    previousPage,
    setFullscreen,
    setIsAutoplayPaused,
    isAutoplayPaused,
  } = useContext(WorkpadRoutingContext);

  const autoplayEnabled = autoplayInterval > 0 ? true : false;
  const dispatch = useDispatch();

  const setFullscreenWithEffects = useCallback(
    (value) => {
      value && dispatch(selectToplevelNodes([]));
      setFullscreen(value);

      if (value === true) {
        trackCanvasUiMetric(
          METRIC_TYPE.COUNT,
          autoplayEnabled
            ? [LAUNCHED_FULLSCREEN, LAUNCHED_FULLSCREEN_AUTOPLAY]
            : LAUNCHED_FULLSCREEN
        );
      }
    },
    [dispatch, setFullscreen, autoplayEnabled]
  );

  const toggleAutoplay = useCallback(() => {
    setIsAutoplayPaused(!isAutoplayPaused);
  }, [setIsAutoplayPaused, isAutoplayPaused]);

  return (
    <Component
      isFullscreen={isFullscreen}
      nextPage={nextPage}
      previousPage={previousPage}
      autoplayEnabled={autoplayEnabled}
      setFullscreen={setFullscreenWithEffects}
      toggleAutoplay={toggleAutoplay}
      {...props}
    />
  );
};

export const FullscreenControl = compose(
  getContext({
    router: PropTypes.object,
  }),
  connect(mapStateToProps, mapDispatchToProps),
  withState('transition', 'setTransition', null),
  withState('prevSelectedPageNumber', 'setPrevSelectedPageNumber', 0),
  withProps(({ selectedPageNumber, prevSelectedPageNumber, transition }) => {
    function getAnimation(pageNumber) {
      if (!transition || !transition.name) {
        return null;
      }
      if (![selectedPageNumber, prevSelectedPageNumber].includes(pageNumber)) {
        return null;
      }
      const { enter, exit } = transitionsRegistry.get(transition.name);
      const laterPageNumber = Math.max(selectedPageNumber, prevSelectedPageNumber);
      const name = pageNumber === laterPageNumber ? enter : exit;
      const direction = prevSelectedPageNumber > selectedPageNumber ? 'reverse' : 'normal';
      return { name, direction };
    }

    return { getAnimation };
  }),
  withHandlers({
    onTransitionEnd:
      ({ setTransition }) =>
      () =>
        setTransition(null),
  })
)(FullscreenControlWithContext);
