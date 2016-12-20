
import Slugify from '../string/slugify';

import ButtonExample
  from '../../views/button/button_example.jsx';

import FormExample
  from '../../views/form/form_example.jsx';

import IconExample
  from '../../views/icon/icon_example.jsx';

import LinkExample
  from '../../views/link/link_example.jsx';

import LocalNavExample
  from '../../views/local_nav/local_nav_example.jsx';

import TableExample
  from '../../views/table/table_example.jsx';

import TabsExample
  from '../../views/tabs/tabs_example.jsx';

import ToolBarExample
  from '../../views/tool_bar/tool_bar_example.jsx';

// Component route names should match the component name exactly.
const components = [{
  name: 'Button',
  component: ButtonExample,
}, {
  name: 'Form',
  component: FormExample,
}, {
  name: 'Icon',
  component: IconExample,
}, {
  name: 'Link',
  component: LinkExample,
}, {
  name: 'LocalNav',
  component: LocalNavExample,
}, {
  name: 'Table',
  component: TableExample,
}, {
  name: 'Tabs',
  component: TabsExample,
}, {
  name: 'ToolBar',
  component: ToolBarExample,
}];

export default {
  components: Slugify.each(components, 'name', 'path'),
  getAppRoutes: function getAppRoutes() {
    const list = this.components;
    return list.slice(0);
  },
};
