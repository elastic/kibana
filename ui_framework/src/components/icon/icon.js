import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import '!!svg-sprite!./assets/app_dashboard.svg';
import '!!svg-sprite!./assets/app_devtools.svg';
import '!!svg-sprite!./assets/app_discover.svg';
import '!!svg-sprite!./assets/app_graph.svg';
import '!!svg-sprite!./assets/app_ml.svg';
import '!!svg-sprite!./assets/app_timelion.svg';
import '!!svg-sprite!./assets/app_visualize.svg';
import '!!svg-sprite!./assets/apps.svg';
import '!!svg-sprite!./assets/logo.svg';
import '!!svg-sprite!./assets/search.svg';
import '!!svg-sprite!./assets/user.svg';

const typeToIconMap = {
  dashboardApp: 'app_dashboard',
  devToolsApp: 'app_devtools',
  discoverApp: 'app_discover',
  graphApp: 'app_graph',
  machineLearningApp: 'app_ml',
  timelionApp: 'app_timelion',
  visualizeApp: 'app_visualize',
  apps: 'apps',
  kibanaLogo: 'logo',
  search: 'search',
  user: 'user',
};

export const TYPES = Object.keys(typeToIconMap);

const sizeToClassNameMap = {
  medium: 'kuiIcon--medium',
  large: 'kuiIcon--large',
  xLarge: 'kuiIcon--xLarge',
  xxLarge: 'kuiIcon--xxLarge',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiIcon = ({ type, size, className, ...rest }) => {
  const classes = classNames('kuiIcon', className, sizeToClassNameMap[size]);
  const svgReference = type ? <use href={`#${typeToIconMap[type]}`} /> : undefined;

  return (
    <svg
      className={classes}
      {...rest}
    >
      {svgReference}
    </svg>
  );
};

KuiIcon.propTypes = {
  type: PropTypes.oneOf(TYPES),
  size: PropTypes.oneOf(SIZES),
};

KuiIcon.defaultProps = {
  size: 'medium',
};
