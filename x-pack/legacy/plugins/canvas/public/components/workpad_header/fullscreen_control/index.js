/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withState, withProps, withHandlers, compose, getContext } from 'recompose';
import { setFullscreen, selectToplevelNodes } from '../../../state/actions/transient';
import { enableAutoplay } from '../../../state/actions/workpad';
import { getFullscreen } from '../../../state/selectors/app';
import {
  getAutoplay,
  getSelectedPageIndex,
  getPages,
  getWorkpad,
} from '../../../state/selectors/workpad';
import { trackCanvasUiMetric, METRIC_TYPE } from '../../../lib/ui_metric';
import {
  LAUNCHED_FULLSCREEN,
  LAUNCHED_FULLSCREEN_AUTOPLAY,
} from '../../../../common/lib/constants';
import { transitionsRegistry } from '../../../lib/transitions_registry';
import { fetchAllRenderables } from '../../../state/actions/elements';
import { FullscreenControl as Component } from './fullscreen_control';

// TODO: a lot of this is borrowed code from `/components/workpad/index.js`.
// We should consider extracting the next/prev page logic into to a shared lib file.
const mapStateToProps = state => ({
  workpadId: getWorkpad(state).id,
  pages: getPages(state),
  selectedPageNumber: getSelectedPageIndex(state) + 1,
  isFullscreen: getFullscreen(state),
  autoplayEnabled: getAutoplay(state).enabled,
});

const mapDispatchToProps = dispatch => ({
  setFullscreen: value => {
    dispatch(setFullscreen(value));
    value && dispatch(selectToplevelNodes([]));
  },
  enableAutoplay: enabled => dispatch(enableAutoplay(enabled)),
  fetchAllRenderables: () => dispatch(fetchAllRenderables()),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return {
    ...ownProps,
    ...stateProps,
    ...dispatchProps,
    setFullscreen: value => {
      dispatchProps.setFullscreen(value);

      if (value === true) {
        trackCanvasUiMetric(
          METRIC_TYPE.COUNT,
          stateProps.autoplayEnabled
            ? [LAUNCHED_FULLSCREEN, LAUNCHED_FULLSCREEN_AUTOPLAY]
            : LAUNCHED_FULLSCREEN
        );
      }
    },
  };
};

export const FullscreenControl = compose(
  getContext({
    router: PropTypes.object,
  }),
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
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
    onPageChange: props => pageNumber => {
      if (pageNumber === props.selectedPageNumber) {
        return;
      }
      props.setPrevSelectedPageNumber(props.selectedPageNumber);
      const transitionPage = Math.max(props.selectedPageNumber, pageNumber) - 1;
      const { transition } = props.pages[transitionPage];
      if (transition) {
        props.setTransition(transition);
      }
      props.router.navigateTo('loadWorkpad', { id: props.workpadId, page: pageNumber });
    },
  }),
  withHandlers({
    onTransitionEnd: ({ setTransition }) => () => setTransition(null),
    nextPage: props => () => {
      const pageNumber = Math.min(props.selectedPageNumber + 1, props.pages.length);
      props.onPageChange(pageNumber);
    },
    previousPage: props => () => {
      const pageNumber = Math.max(1, props.selectedPageNumber - 1);
      props.onPageChange(pageNumber);
    },
  })
)(Component);
