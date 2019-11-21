/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEqual from 'react-fast-compare';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { branch, compose, shouldUpdate, withProps } from 'recompose';
import { canUserWrite, getFullscreen } from '../../state/selectors/app';
import { getNodes, getPageById, isWriteable } from '../../state/selectors/workpad';
import { not } from '../../lib/aeroelastic/functional';
import { StaticPage } from './workpad_static_page';
import { InteractivePage } from './workpad_interactive_page';

const animationProps = ({ animation, isSelected }) =>
  animation
    ? {
        className: animation.name + ' ' + (isSelected ? 'isActive' : 'isInactive'),
        animationStyle: {
          animationDirection: animation.direction,
          animationDuration: '1s', // TODO: Make this configurable
        },
      }
    : { className: isSelected ? 'isActive' : 'isInactive', animationStyle: {} };

const mapStateToProps = (state, { isSelected, pageId }) => ({
  isInteractive: isSelected && !getFullscreen(state) && isWriteable(state) && canUserWrite(state),
  elements: getNodes(state, pageId),
  pageStyle: getPageById(state, pageId).style,
});

export const WorkpadPage = compose(
  shouldUpdate(not(isEqual)), // this is critical, else random unrelated rerenders in the parent cause glitches here
  withProps(animationProps),
  connect(mapStateToProps),
  branch(({ isInteractive }) => isInteractive, InteractivePage, StaticPage)
)();

WorkpadPage.propTypes = {
  pageId: PropTypes.string.isRequired,
};
