import Slugify from '../string/slugify';

import AccordionExample
  from '../../views/accordion/accordion_example';

import AccessibilityExample
  from '../../views/accessibility/accessibility_example';

import AdvancedSettingsExample
  from '../../views/advanced_settings/advanced_settings_example';

import AvatarExample
  from '../../views/avatar/avatar_example';

import BadgeExample
  from '../../views/badge/badge_example';

import BottomBarExample
  from '../../views/bottom_bar/bottom_bar_example';

import ButtonExample
  from '../../views/button/button_example';

import CallOutExample
  from '../../views/call_out/call_out_example';

import CodeExample
  from '../../views/code/code_example';

import ContextMenuExample
  from '../../views/context_menu/context_menu_example';

import DescriptionListExample
  from '../../views/description_list/description_list_example';

import FlexExample
  from '../../views/flex/flex_example';

import FormExample
  from '../../views/form/form_example';

import IconExample
  from '../../views/icon/icon_example';

import HeaderExample
  from '../../views/header/header_example';

import HorizontalRuleExample
  from '../../views/horizontal_rule/horizontal_rule_example';

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

import PanelExample
  from '../../views/panel/panel_example';

import PaginationExample
  from '../../views/pagination/pagination_example';

import LoadingExample
  from '../../views/loading/loading_example';

import PopoverExample
  from '../../views/popover/popover_example';

import ProgressExample
  from '../../views/progress/progress_example';

import SideNavExample
  from '../../views/side_nav/side_nav_example';

import SpacerExample
  from '../../views/spacer/spacer_example';

import TableExample
  from '../../views/table/table_example';

import TabsExample
  from '../../views/tabs/tabs_example';

import TextExample
  from '../../views/text/text_example';

import ToastExample
  from '../../views/toast/toast_example';

import TitleExample
  from '../../views/title/title_example';

import TextScalingSandbox
  from '../../views/text_scaling/text_scaling_sandbox';

// Component route names should match the component name exactly.
const components = [{
  name: 'Accordion',
  component: AccordionExample,
  hasReact: true,
}, {
  name: 'Accessibility',
  component: AccessibilityExample,
  hasReact: true,
}, {
  name: 'Avatar',
  component: AvatarExample,
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
  name: 'BottomBar',
  component: BottomBarExample,
  hasReact: true,
}, {
  name: 'CallOut',
  component: CallOutExample,
  hasReact: true,
}, {
  name: 'Code',
  component: CodeExample,
  hasReact: true,
}, {
  name: 'ContextMenu',
  component: ContextMenuExample,
  hasReact: true,
}, {
  name: 'DescriptionList',
  component: DescriptionListExample,
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
  name: 'HorizontalRule',
  component: HorizontalRuleExample,
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
  name: 'Pagination',
  component: PaginationExample,
  hasReact: true,
}, {
  name: 'Panel',
  component: PanelExample,
  hasReact: true,
}, {
  name: 'Popover',
  component: PopoverExample,
  hasReact: true,
}, {
  name: 'Progress',
  component: ProgressExample,
  hasReact: true,
}, {
  name: 'SideNav',
  component: SideNavExample,
  hasReact: true,
}, {
  name: 'Spacer',
  component: SpacerExample,
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
  name: 'Text',
  component: TextExample,
  hasReact: true,
}, {
  name: 'Toast',
  component: ToastExample,
  hasReact: true,
}, {
  name: 'Title',
  component: TitleExample,
  hasReact: true,
}];

const sandboxes = [{
  name: 'AdvancedSettings',
  component: AdvancedSettingsExample,
  hasReact: true,
}, {
  name: 'Kibana',
  component: KibanaSandbox,
  hasReact: true,
}, {
  name: 'TextScalingSandbox',
  component: TextScalingSandbox,
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
