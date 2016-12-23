import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'Simple',
  description: (
    <p>Here's a simple LocalNav with a Title in the top left corner and Menu in the top right.</p>
  ),
  html: require('./local_nav_simple.html'),
  hasDarkTheme: true,
}, {
  title: 'Breadcrumbs',
  description: (
    <p>You can replace the Title with Breadcrumbs.</p>
  ),
  html: require('./local_nav_breadcrumbs.html'),
  hasDarkTheme: true,
}, {
  title: 'Search',
  description: (
    <p>You can add a Search component for filtering results.</p>
  ),
  html: require('./local_nav_search.html'),
  hasDarkTheme: true,
}, {
  title: 'Invalid Search',
  html: require('./local_nav_search_error.html'),
  hasDarkTheme: true,
}, {
  title: 'Selected and disabled Menu Item states',
  description: (
    <div>
      <p>When the user selects a Menu Item, additional content can be displayed inside of a Dropdown.</p>
      <p>Menu Items can also be disabled, in which case they become non-interactive.</p>
    </div>
  ),
  html: require('./local_nav_menu_item_states.html'),
  hasDarkTheme: true,
}, {
  title: 'Dropdown',
  description: (
    <p>Selecting a Menu Item will commonly result in an open Dropdown.</p>
  ),
  html: require('./local_nav_dropdown.html'),
  hasDarkTheme: true,
}, {
  title: 'Dropdown panels',
  description: (
    <p>You can split the Dropdown into side-by-side Panels.</p>
  ),
  html: require('./local_nav_dropdown_panels.html'),
  hasDarkTheme: true,
}, {
  title: 'Tabs',
  description: (
    <p>You can display Tabs for navigating local content.</p>
  ),
  html: require('./local_nav_tabs.html'),
  hasDarkTheme: true,
}]);
