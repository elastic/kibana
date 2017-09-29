import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import '!!svg-sprite!./assets/app_apm.svg';
import '!!svg-sprite!./assets/app_dashboard.svg';
import '!!svg-sprite!./assets/app_devtools.svg';
import '!!svg-sprite!./assets/app_discover.svg';
import '!!svg-sprite!./assets/app_graph.svg';
import '!!svg-sprite!./assets/app_logging.svg';
import '!!svg-sprite!./assets/app_ml.svg';
import '!!svg-sprite!./assets/app_monitoring.svg';
import '!!svg-sprite!./assets/app_timelion.svg';
import '!!svg-sprite!./assets/app_visualize.svg';
import '!!svg-sprite!./assets/apps.svg';
import '!!svg-sprite!./assets/arrow_down.svg';
import '!!svg-sprite!./assets/arrow_left.svg';
import '!!svg-sprite!./assets/arrow_right.svg';
import '!!svg-sprite!./assets/arrow_up.svg';
import '!!svg-sprite!./assets/bolt.svg';
import '!!svg-sprite!./assets/boxes_horizontal.svg';
import '!!svg-sprite!./assets/boxes_vertical.svg';
import '!!svg-sprite!./assets/brush.svg';
import '!!svg-sprite!./assets/bullseye.svg';
import '!!svg-sprite!./assets/check.svg';
import '!!svg-sprite!./assets/clock.svg';
import '!!svg-sprite!./assets/console.svg';
import '!!svg-sprite!./assets/controls_horizontal.svg';
import '!!svg-sprite!./assets/controls_vertical.svg';
import '!!svg-sprite!./assets/cross.svg';
import '!!svg-sprite!./assets/document.svg';
import '!!svg-sprite!./assets/dot.svg';
import '!!svg-sprite!./assets/empty.svg';
import '!!svg-sprite!./assets/face_happy.svg';
import '!!svg-sprite!./assets/face_sad.svg';
import '!!svg-sprite!./assets/full_screen.svg';
import '!!svg-sprite!./assets/gear.svg';
import '!!svg-sprite!./assets/grid.svg';
import '!!svg-sprite!./assets/help.svg';
import '!!svg-sprite!./assets/link.svg';
import '!!svg-sprite!./assets/list_add.svg';
import '!!svg-sprite!./assets/list.svg';
import '!!svg-sprite!./assets/lock.svg';
import '!!svg-sprite!./assets/logo_beats.svg';
import '!!svg-sprite!./assets/logo_cloud.svg';
import '!!svg-sprite!./assets/logo_elastic_stack.svg';
import '!!svg-sprite!./assets/logo_gmail.svg';
import '!!svg-sprite!./assets/logo_logstash.svg';
import '!!svg-sprite!./assets/logo_slack.svg';
import '!!svg-sprite!./assets/logo_webhook.svg';
import '!!svg-sprite!./assets/logo_xpack.svg';
import '!!svg-sprite!./assets/logo.svg';
import '!!svg-sprite!./assets/map_marker.svg';
import '!!svg-sprite!./assets/node.svg';
import '!!svg-sprite!./assets/pencil.svg';
import '!!svg-sprite!./assets/plus_in_circle.svg';
import '!!svg-sprite!./assets/search.svg';
import '!!svg-sprite!./assets/shard.svg';
import '!!svg-sprite!./assets/share.svg';
import '!!svg-sprite!./assets/sort_down.svg';
import '!!svg-sprite!./assets/sort_up.svg';
import '!!svg-sprite!./assets/star_empty.svg';
import '!!svg-sprite!./assets/tear.svg';
import '!!svg-sprite!./assets/trash.svg';
import '!!svg-sprite!./assets/user.svg';

const humanizeCamelCase = str => (
  // Put spaces between words in camel-cased strings.
  str.replace(/([A-Z])/g, g => ` ${g[0].toLowerCase()}`)
);

const typeToIconMap = {
  apmApp: 'app_apm',
  apps: 'apps',
  arrowDown: 'arrow_down',
  arrowLeft: 'arrow_left',
  arrowRight: 'arrow_right',
  arrowUp: 'arrow_up',
  bolt: 'bolt',
  boxesHorizontal: 'boxes_horizontal',
  boxesVertical: 'boxes_vertical',
  brush: 'brush',
  bullseye: 'bullseye',
  check: 'check',
  clock: 'clock',
  console: 'console',
  controlsHorizontal: 'controls_horizontal',
  controlsVertical: 'controls_vertical',
  cross: 'cross',
  dashboardApp: 'app_dashboard',
  devToolsApp: 'app_devtools',
  discoverApp: 'app_discover',
  document: 'document',
  dot: 'dot',
  empty: 'empty',
  faceHappy: 'face_happy',
  faceSad: 'face_sad',
  fullScreen: 'full_screen',
  gear: 'gear',
  graphApp: 'app_graph',
  grid: 'grid',
  help: 'help',
  link: 'link',
  list: 'list',
  listAdd: 'list_add',
  lock: 'lock',
  loggingApp: 'app_logging',
  logoBeats: 'logo_beats',
  logoCloud: 'logo_cloud',
  logoElasticStack: 'logo_elastic_stack',
  logoGmail: 'logo_gmail',
  logoKibana: 'logo',
  logoLogstash: 'logo_logstash',
  logoSlack: 'logo_slack',
  logoWebhook: 'logo_webhook',
  logoXpack: 'logo_xpack',
  machineLearningApp: 'app_ml',
  mapMarker: 'map_marker',
  monitoringApp: 'app_monitoring',
  node: 'node',
  pencil: 'pencil',
  plusInCircle: 'plus_in_circle',
  search: 'search',
  shard: 'shard',
  share: 'share',
  sortDown: 'sort_down',
  sortUp: 'sort_up',
  starEmpty: 'star_empty',
  tear: 'tear',
  timelionApp: 'app_timelion',
  trash: 'trash',
  user: 'user',
  visualizeApp: 'app_visualize',
};

export const TYPES = Object.keys(typeToIconMap);

const sizeToClassNameMap = {
  original: '',
  medium: 'kuiIcon--medium',
  large: 'kuiIcon--large',
  xLarge: 'kuiIcon--xLarge',
  xxLarge: 'kuiIcon--xxLarge',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiIcon = ({
  type,
  size,
  title,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiIcon', className, sizeToClassNameMap[size]);

  const titleElement =
    title
    ? <title>{title}</title>
    : <title>{`${humanizeCamelCase(type)} icon`}</title>;
  const svgReference = <use href={`#${typeToIconMap[type]}`} />;

  return (
    <svg
      className={classes}
      {...rest}
    >
      {titleElement}
      {svgReference}
    </svg>
  );
};

KuiIcon.propTypes = {
  type: PropTypes.oneOf(TYPES),
  size: PropTypes.oneOf(SIZES),
  title: PropTypes.string,
};

KuiIcon.defaultProps = {
  className: 'kuiIcon--basic',
  size: 'medium',
};
