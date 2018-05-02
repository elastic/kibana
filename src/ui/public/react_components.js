import 'ngreact';

import {
  KuiToolBarSearchBox,
} from '@kbn/ui-framework/components';

import {
  EuiConfirmModal,
  EuiIcon,
  EuiColorPicker,
  EuiIconTip,
} from '@elastic/eui';

import { uiModules } from './modules';

const app = uiModules.get('app/kibana', ['react']);

app.directive('toolBarSearchBox', reactDirective => reactDirective(KuiToolBarSearchBox));

app.directive('confirmModal', reactDirective => reactDirective(EuiConfirmModal));

app.directive('icon', reactDirective => reactDirective(EuiIcon));

app.directive('colorPicker', reactDirective => reactDirective(EuiColorPicker));

app.directive('iconTip', reactDirective => reactDirective(EuiIconTip, ['content', 'type', 'position', 'title']));
