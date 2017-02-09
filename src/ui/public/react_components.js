import 'ngreact';

import {
  PlusIcon,
  TrashIcon,
} from 'ui_framework/components';

import uiModules from 'ui/modules';
const app = uiModules.get('app/kibana', ['react']);
app.directive('plusIconComponent', function (reactDirective) {
  return reactDirective(PlusIcon);
});
app.directive('trashIconComponent', function (reactDirective) {
  return reactDirective(TrashIcon);
});
