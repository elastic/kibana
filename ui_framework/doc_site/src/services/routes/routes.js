import Slugify from '../string/slugify';

import AccessibilityExample
  from '../../views/accessibility/accessibility_example';

import IconExample
  from '../../views/icon/icon_example';

import HeaderExample
  from '../../views/header/header_example';

import KeyPadMenuExample
  from '../../views/key_pad_menu/key_pad_menu_example';

import KibanaSandbox
  from '../../views/kibana/kibana_sandbox';

import PageExample
  from '../../views/page/page_example';

import PopoverExample
  from '../../views/popover/popover_example';

import TypographyExample
  from '../../views/typography/typography_example';


// Component route names should match the component name exactly.
const components = [{
  name: 'Accessibility',
  component: AccessibilityExample,
  hasReact: true,
}, {
  name: 'Icon',
  component: IconExample,
  hasReact: true,
}, {
  name: 'Header',
  component: HeaderExample,
  hasReact: true,
}, {
  name: 'KeyPadMenu',
  component: KeyPadMenuExample,
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
