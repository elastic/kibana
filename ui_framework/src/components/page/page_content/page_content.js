import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import { KuiPanel, SIZES } from '../../../components/panel/panel';

const verticalPositionToClassNameMap = {
  center: 'kuiPageContent--verticalCenter',
};

const horizontalPositionToClassNameMap = {
  center: 'kuiPageContent--horizontalCenter',
};

export const VERTICAL_POSITIONS = Object.keys(verticalPositionToClassNameMap);
export const HORIZONTAL_POSITIONS = Object.keys(horizontalPositionToClassNameMap);

export const KuiPageContent = ({
  verticalPosition,
  horizontalPosition,
  panelPaddingSize,
  children,
  className,
  ...rest }) => {

  const classes = classNames(
    'kuiPageContent',
    className,
    verticalPositionToClassNameMap[verticalPosition],
    horizontalPositionToClassNameMap[horizontalPosition]
  );

  return (
    <KuiPanel
      className={classes}
      paddingSize={panelPaddingSize}
      {...rest}
    >
      {children}
    </KuiPanel>
  );
};

KuiPageContent.propTypes = {
  panelPaddingSize: PropTypes.oneOf(SIZES),
  verticalPosition: PropTypes.oneOf(VERTICAL_POSITIONS),
  horizontalPosition: PropTypes.oneOf(HORIZONTAL_POSITIONS),
};

KuiPageContent.defaultProps = {
  panelPaddingSize: 'l',
};
