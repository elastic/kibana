import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

// TODO: Remove once EUI has typing for EuiFlyoutBody
declare module '@elastic/eui' {
  export const EuiFlyoutBody: React.SFC<any>;
}

import { EuiFlyoutBody } from '@elastic/eui';

/**
 * The InspectorView component should be the top most element in every implemented
 * inspector view. It makes sure, that the appropriate stylings are applied to the
 * view.
 */
const InspectorView: React.SFC<{ useFlex?: boolean }> = ({
  useFlex,
  children,
}) => {
  const classes = classNames({
    'inspector-view__flex': Boolean(useFlex),
  });
  return <EuiFlyoutBody className={classes}>{children}</EuiFlyoutBody>;
};

InspectorView.propTypes = {
  /**
   * Set to true if the element should have display: flex set.
   */
  useFlex: PropTypes.bool,
};

export { InspectorView };
