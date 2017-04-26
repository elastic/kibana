import Slugify from '../string/slugify';

import ActionItemExample
  from '../../views/action_item/action_item_example';

import BadgeExample
  from '../../views/badge/badge_example';

import BarExample
  from '../../views/bar/bar_example';

import ButtonExample
  from '../../views/button/button_example';

import CardExample
  from '../../views/card/card_example';

import ColumnExample
  from '../../views/column/column_example';

import EventExample
  from '../../views/event/event_example';

import EventsSandbox
  from '../../views/event/events_sandbox';

import FormExample
  from '../../views/form/form_example';

import FormLayoutExample
  from '../../views/form_layout/form_layout_example';

import GalleryExample
  from '../../views/gallery/gallery_example';

import HeaderBarExample
  from '../../views/header_bar/header_bar_example';

import HeaderBarSandbox
  from '../../views/header_bar/header_bar_sandbox';

import IconExample
  from '../../views/icon/icon_example';

import InfoPanelExample
  from '../../views/info_panel/info_panel_example';

import LinkExample
  from '../../views/link/link_example';

import LocalNavExample
  from '../../views/local_nav/local_nav_example';

import MenuExample
  from '../../views/menu/menu_example';

import MenuButtonExample
  from '../../views/menu_button/menu_button_example';

import MicroButtonExample
  from '../../views/micro_button/micro_button_example';

import ModalExample
  from '../../views/modal/modal_example';

import NoticeSandbox
  from '../../views/notice/notice_sandbox';

import PanelExample
  from '../../views/panel/panel_example';

import StatusTextExample
  from '../../views/status_text/status_text_example';

import TableExample
  from '../../views/table/table_example';

import TabsExample
  from '../../views/tabs/tabs_example';

import ToggleButtonExample
  from '../../views/toggle_button/toggle_button_example';

import ToolBarExample
  from '../../views/tool_bar/tool_bar_example';

import TypographyExample
  from '../../views/typography/typography_example';

import VerticalRhythmExample
  from '../../views/vertical_rhythm/vertical_rhythm_example';

import ViewSandbox
  from '../../views/view/view_sandbox';

// Component route names should match the component name exactly.
const components = [{
  name: 'ActionItem',
  component: ActionItemExample,
}, {
  name: 'Badge',
  component: BadgeExample,
}, {
  name: 'Bar',
  component: BarExample,
}, {
  name: 'Button',
  component: ButtonExample,
}, {
  name: 'Card',
  component: CardExample,
}, {
  name: 'Column',
  component: ColumnExample,
}, {
  name: 'Event',
  component: EventExample,
}, {
  name: 'Form',
  component: FormExample,
}, {
  name: 'FormLayout',
  component: FormLayoutExample,
}, {
  name: 'Gallery',
  component: GalleryExample,
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
  name: 'Notice',
  component: NoticeSandbox,
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
