import 'ngreact';

import {
  KuiConfirmModal,
  KuiToolBarSearchBox,
} from 'ui_framework/components';

import { uiModules } from 'ui/modules';

const app = uiModules.get('app/kibana', ['react']);

app.directive('confirmModal', function (reactDirective) {
  return reactDirective(KuiConfirmModal);
});

app.directive('toolBarSearchBox', function (reactDirective) {
  return reactDirective(KuiToolBarSearchBox);
});
