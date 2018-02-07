import 'ngreact';

import {
  KuiToolBarSearchBox,
} from 'ui_framework/components';

import {
  EuiConfirmModal,
  EuiIcon,
} from '@elastic/eui';

import { uiModules } from 'ui/modules';

const app = uiModules.get('app/kibana', ['react']);

app.directive('toolBarSearchBox', reactDirective => reactDirective(KuiToolBarSearchBox));

app.directive('confirmModal', reactDirective => reactDirective(EuiConfirmModal));

app.directive('icon', reactDirective => reactDirective(EuiIcon));
