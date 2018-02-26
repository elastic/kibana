import 'ngreact';

import { TagsInput } from './components/tags_input';

import { uiModules } from 'ui/modules';

const app = uiModules.get('app/kibana', ['react']);

app.directive('tagsInput', reactDirective => reactDirective(TagsInput));
