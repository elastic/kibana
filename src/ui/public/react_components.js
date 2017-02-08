import 'ngreact';

import { PlusIcon } from 'ui_framework/components/icon/plus_icon';
import { TrashIcon } from 'ui_framework/components/icon/trash_icon';

import uiModules from 'ui/modules';
const app = uiModules.get('app/kibana', ['react']);
app.value('PlusIconComponent', PlusIcon);
app.value('TrashIconComponent', TrashIcon);
