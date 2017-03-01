import Slugify from '../string/slugify';

import ActionItemExample
  from '../../views/action_item/action_item_example.jsx';

import BarExample
  from '../../views/bar/bar_example.jsx';

import ButtonExample
  from '../../views/button/button_example.jsx';

import EventExample
  from '../../views/event/event_example.jsx';

import EventsSandbox
  from '../../views/event/events_sandbox.jsx';

import FormExample
  from '../../views/form/form_example.jsx';

import HeaderBarExample
  from '../../views/header_bar/header_bar_example.jsx';

import HeaderBarSandbox
  from '../../views/header_bar/header_bar_sandbox.jsx';

import IconExample
  from '../../views/icon/icon_example.jsx';

import InfoPanelExample
  from '../../views/info_panel/info_panel_example.jsx';

import LinkExample
  from '../../views/link/link_example.jsx';

import LocalNavExample
  from '../../views/local_nav/local_nav_example.jsx';

import MenuExample
  from '../../views/menu/menu_example.jsx';

import MenuButtonExample
  from '../../views/menu_button/menu_button_example.jsx';

import MicroButtonExample
  from '../../views/micro_button/micro_button_example.jsx';

import ModalExample
  from '../../views/modal/modal_example.jsx';

import PanelExample
  from '../../views/panel/panel_example.jsx';

import StatusTextExample
  from '../../views/status_text/status_text_example.jsx';

import TableExample
  from '../../views/table/table_example.jsx';

import TabsExample
  from '../../views/tabs/tabs_example.jsx';

import ToggleButtonExample
  from '../../views/toggle_button/toggle_button_example.jsx';

import ToolBarExample
  from '../../views/tool_bar/tool_bar_example.jsx';

import TypographyExample
  from '../../views/typography/typography_example.jsx';

import VerticalRhythmExample
  from '../../views/vertical_rhythm/vertical_rhythm_example.jsx';

import ViewSandbox
  from '../../views/view/view_sandbox.jsx';

// Component route names should match the component name exactly.
const components = [{
  name: 'ActionItem',
  component: ActionItemExample,
}, {
  name: 'Bar',
  component: BarExample,
}, {
  name: 'Button',
  component: ButtonExample,
}, {
  name: 'Event',
  component: EventExample,
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
  name: 'Menu',
  component: MenuExample,
}, {
  name: 'MenuButton',
  component: MenuButtonExample,
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
  name: 'StatusText',
  component: StatusTextExample,
}, {
  name: 'Table',
  component: TableExample,
}, {
  name: 'Tabs',
  component: TabsExample,
}, {
  name: 'ToggleButton',
  component: ToggleButtonExample,
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

const sandboxes = [{
  name: 'Events',
  component: EventsSandbox,
}, {
  name: 'HeaderBar with Table',
  component: HeaderBarSandbox,
}, {
  name: 'View',
  component: ViewSandbox,
}];

export default {
  components: Slugify.each(components, 'name', 'path'),
  sandboxes: Slugify.each(sandboxes, 'name', 'path'),
  getAppRoutes: function getAppRoutes() {
    return this.components.concat(this.sandboxes);
  },
};
