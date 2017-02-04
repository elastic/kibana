import uiModules from 'ui/modules';
import { PagerService } from './pager_service';

const app = uiModules.get('kibana');

app.factory('pagerService', () => {
  return {
    create(...args) {
      return new PagerService(...args);
    }
  };
});
