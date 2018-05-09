import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  EuiFlyoutBody,
} from '@elastic/eui';

/**
 * The InspectorView component should be the top most element in every implemented
 * inspector view. It makes sure, that the appropriate stylings are applied to the
 * view.
 */
function InspectorView(props) {
  const classes = classNames({
    'inspector-view__flex': Boolean(props.useFlex)
  });
  return (
    <EuiFlyoutBody className={classes}>
      {props.children}
    </EuiFlyoutBody>
  );
}

InspectorView.propTypes = {
  /**
   * Any children that you want to render in the view.
   */
  children: PropTypes.node.isRequired,
  /**
   * Set to true if the element should have display: flex set.
   */
  useFlex: PropTypes.bool,
};

export { InspectorView };
