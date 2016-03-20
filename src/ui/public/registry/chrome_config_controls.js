import _ from 'lodash';
import uiRegistry from 'ui/registry/_registry';
export default uiRegistry({
  name: 'chromeConfigControls',
  order: ['order'],
  index: ['name'],
  constructor() {
    this.forEach(configControl => {
      configControl.name = configControl.name.replace(/[^a-zA-Z0-9]/g, '_');
    });
  }
});
