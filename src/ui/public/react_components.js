import 'ngreact';

import {
  PlusButton,
  TrashButton
} from 'ui_framework/components';

import uiModules from 'ui/modules';
const app = uiModules.get('app/kibana', ['react']);
app.value('PlusButtonComponent', PlusButton);
app.value('TrashButtonComponent', TrashButton);
