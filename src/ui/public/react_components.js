import 'ngreact';

import {
  KuiToolBarSearchBox,
  KuiConfirmModal,
} from 'ui_framework/components';

import { uiModules } from 'ui/modules';

const app = uiModules.get('app/kibana', ['react']);
app.directive('toolBarSearchBox', function (reactDirective) {
  return reactDirective(KuiToolBarSearchBox);
});
app.directive('confirmModal', function (reactDirective) {
  return reactDirective(KuiConfirmModal);
});
