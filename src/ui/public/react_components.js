import 'ngreact';

import {
  CreateButtonLink,
  DeleteButton
} from 'ui_framework/components';

import uiModules from 'ui/modules';
const app = uiModules.get('app/kibana', ['react']);
app.directive('createButtonLink', function (reactDirective) {
  return reactDirective(CreateButtonLink);
});
app.directive('deleteButton', function (reactDirective) {
  return reactDirective(DeleteButton);
});
