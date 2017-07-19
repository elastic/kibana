import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.constant('timeUnits', {
  s: 'second',
  m: 'minute',
  h: 'hour',
  d: 'day',
  w: 'week',
  M: 'month',
  y: 'year'
});

