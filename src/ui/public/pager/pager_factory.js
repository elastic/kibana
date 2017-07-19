import { uiModules } from 'ui/modules';
import { Pager } from './pager';

const app = uiModules.get('kibana');

app.factory('pagerFactory', () => {
  return {
    create(...args) {
      return new Pager(...args);
    }
  };
});
