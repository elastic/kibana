import 'ngreact';

import {
  KuiToolBarSearchBox,
  KuiConfirmModal,
} from 'ui_framework/components';

import {
  PaginatedTable,
} from './paginated_table';

import { uiModules } from 'ui/modules';

const app = uiModules.get('app/kibana', ['react']);

app.directive('paginatedTable', function (reactDirective) {
  return reactDirective(PaginatedTable);
});

app.directive('toolBarSearchBox', function (reactDirective) {
  return reactDirective(KuiToolBarSearchBox);
});

app.directive('confirmModal', function (reactDirective) {
  return reactDirective(KuiConfirmModal);
});
