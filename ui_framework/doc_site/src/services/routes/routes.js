import Slugify from '../string/slugify';

import AccessibilityExample
  from '../../views/accessibility/accessibility_example';

import BadgeExample
  from '../../views/badge/badge_example';

import ButtonExample
  from '../../views/button/button_example';

import CallOutExample
  from '../../views/call_out/call_out_example';

import ContextMenuExample
  from '../../views/context_menu/context_menu_example';

import FlexExample
  from '../../views/flex/flex_example';

import FormExample
  from '../../views/form/form_example';

import IconExample
  from '../../views/icon/icon_example';

import HeaderExample
  from '../../views/header/header_example';

import KeyPadMenuExample
  from '../../views/key_pad_menu/key_pad_menu_example';

import KibanaSandbox
  from '../../views/kibana/kibana_sandbox';

import LinkExample
  from '../../views/link/link_example';

import ModalExample
  from '../../views/modal/modal_example';

import PageExample
  from '../../views/page/page_example';

import LoadingExample
  from '../../views/loading/loading_example';

import PopoverExample
  from '../../views/popover/popover_example';

import SideNavExample
  from '../../views/side_nav/side_nav_example';

import TableExample
  from '../../views/table/table_example';

import TabsExample
  from '../../views/tabs/tabs_example';

import ToastExample
  from '../../views/toast/toast_example';

import TypographyExample
  from '../../views/typography/typography_example';

// Component route names should match the component name exactly.
const components = [{
  name: 'Accessibility',
  component: AccessibilityExample,
  hasReact: true,
}, {
  name: 'Button',
  component: ButtonExample,
  hasReact: true,
}, {
  name: 'Badge',
  component: BadgeExample,
  hasReact: true,
}, {
  name: 'CallOut',
  component: CallOutExample,
  hasReact: true,
}, {
  name: 'ContextMenu',
  component: ContextMenuExample,
  hasReact: true,
}, {
  name: 'Flex',
  component: FlexExample,
  hasReact: true,
}, {
  name: 'Form',
  component: FormExample,
  hasReact: true,
}, {
  name: 'Header',
  component: HeaderExample,
  hasReact: true,
}, {
  name: 'Icon',
  component: IconExample,
  hasReact: true,
}, {
  name: 'KeyPadMenu',
  component: KeyPadMenuExample,
  hasReact: true,
}, {
  name: 'Link',
  component: LinkExample,
  hasReact: true,
}, {
  name: 'Loading',
  component: LoadingExample,
  hasReact: true,
}, {
  name: 'Modal',
  component: ModalExample,
  hasReact: true,
}, {
  name: 'Page',
  component: PageExample,
  hasReact: true,
}, {
  name: 'Popover',
  component: PopoverExample,
  hasReact: true,
}, {
  name: 'SideNav',
  component: SideNavExample,
  hasReact: true,
}, {
  name: 'Table',
  component: TableExample,
  hasReact: true,
}, {
  name: 'Tabs',
  component: TabsExample,
  hasReact: true,
}, {
  name: 'Toast',
  component: ToastExample,
  hasReact: true,
}, {
  name: 'Typography',
  component: TypographyExample,
  hasReact: true,
}];

const sandboxes = [{
  name: 'Kibana',
  component: KibanaSandbox,
  hasReact: true,
}];

const allRoutes = components.concat(sandboxes);

export default {
  components: Slugify.each(components, 'name', 'path'),
  sandboxes: Slugify.each(sandboxes, 'name', 'path'),
  getAppRoutes: function getAppRoutes() {
    return allRoutes;
  },
  getPreviousRoute: function getPreviousRoute(routeName) {
    const index = allRoutes.findIndex(item => {
      return item.name === routeName;
    });

    return index >= 0 ? allRoutes[index - 1] : undefined;
  },
  getNextRoute: function getNextRoute(routeName) {
    const index = allRoutes.findIndex(item => {
      return item.name === routeName;
    });

    return index < allRoutes.length - 1 ? allRoutes[index + 1] : undefined;
  },
};
