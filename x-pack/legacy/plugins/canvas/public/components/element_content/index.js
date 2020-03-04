/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { get } from 'lodash';
import { npStart } from 'ui/new_platform';
import { getSelectedPage, getPageById } from '../../state/selectors/workpad';
import { ElementContent as Component } from './element_content';

const mapStateToProps = state => ({
  backgroundColor: getPageById(state, getSelectedPage(state)).style.background,
});

export const ElementContent = compose(
  connect(mapStateToProps),
  withProps(({ renderable }) => ({
    renderFunction: npStart.plugins.expressions.getRenderer(get(renderable, 'as')),
  }))
)(Component);

ElementContent.propTypes = {
  renderable: PropTypes.shape({
    as: PropTypes.string,
  }),
};
