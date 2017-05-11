import { uiModules } from 'ui/modules';
import { optOutOfGettingStarted } from './opt_out_service';

const app = uiModules.get('kibana');
app.directive('kbnGettingStartedOptOut', () => {
  return {
    restrict: 'A',
    link: (scope, element) =>  {
      element.on('click', () => {
        optOutOfGettingStarted();
      });
    }
  };
});
