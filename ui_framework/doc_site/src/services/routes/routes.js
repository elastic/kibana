
import Slugify from '../string/slugify';

import BarExample
  from '../../views/bar/bar_example.jsx';

import ButtonExample
  from '../../views/button/button_example.jsx';

import FormExample
  from '../../views/form/form_example.jsx';

import HeaderBarExample
  from '../../views/header_bar/header_bar_example.jsx';

import IconExample
  from '../../views/icon/icon_example.jsx';

import InfoPanelExample
  from '../../views/info_panel/info_panel_example.jsx';

import LinkExample
  from '../../views/link/link_example.jsx';

import ModalExample
  from '../../views/modal/modal_example.jsx';

import LocalNavExample
  from '../../views/local_nav/local_nav_example.jsx';

import MicroButtonExample
  from '../../views/micro_button/micro_button_example.jsx';

import PanelExample
  from '../../views/panel/panel_example.jsx';

import TableExample
  from '../../views/table/table_example.jsx';

import TabsExample
  from '../../views/tabs/tabs_example.jsx';

import ToolBarExample
  from '../../views/tool_bar/tool_bar_example.jsx';

import TypographyExample
  from '../../views/typography/typography_example.jsx';

import VerticalRhythmExample
  from '../../views/vertical_rhythm/vertical_rhythm_example.jsx';

// Component route names should match the component name exactly.
const components = [{
  name: 'Bar',
  component: BarExample,
}, {
  name: 'Button',
  component: ButtonExample,
}, {
  name: 'Form',
  component: FormExample,
}, {
  name: 'HeaderBar',
  component: HeaderBarExample,
}, {
  name: 'Icon',
  component: IconExample,
}, {
  name: 'InfoPanel',
  component: InfoPanelExample,
}, {
  name: 'Link',
  component: LinkExample,
}, {
  name: 'LocalNav',
  component: LocalNavExample,
}, {
  name: 'MicroButton',
  component: MicroButtonExample,
}, {
  name: 'Modal',
  component: ModalExample,
}, {
  name: 'Panel',
  component: PanelExample,
}, {
  name: 'Table',
  component: TableExample,
}, {
  name: 'Tabs',
  component: TabsExample,
}, {
  name: 'ToolBar',
  component: ToolBarExample,
}, {
  name: 'Typography',
  component: TypographyExample,
}, {
  name: 'VerticalRhythm',
  component: VerticalRhythmExample,
}];

export default {
  components: Slugify.each(components, 'name', 'path'),
  getAppRoutes: function getAppRoutes() {
    const list = this.components;
    return list.slice(0);
  },
};
