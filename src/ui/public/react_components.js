import 'ngreact';

import {
  PlusIcon,
  TrashIcon,
} from 'ui_framework/components';

import uiModules from 'ui/modules';
const app = uiModules.get('app/kibana', ['react']);
app.value('PlusIconComponent', PlusIcon);
app.value('TrashIconComponent', TrashIcon);
