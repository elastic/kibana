import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.constant('dateRange', [
  { value: 'auto', display: 'Auto', section: 0 },
  { value: 'ms', display: 'Millisecond', section: 1 },
  { value: 's', display: 'Second', section: 1 },
  { value: 'm', display: 'Minute', section: 1 },
  { value: 'h', display: 'Hourly', section: 1 },
  { value: 'd', display: 'Daily', section: 2 },
  { value: 'w', display: 'Weekly', section: 2 },
  { value: 'M', display: 'Monthly', section: 2 },
  { value: 'y', display: 'Yearly', section: 2 }
]);
