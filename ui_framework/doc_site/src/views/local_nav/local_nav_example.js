import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Simple from './local_nav_simple';
import simpleSource from '!!raw!./local_nav_simple';
const simpleHtml = renderToHtml(Simple);

import Breadcrumbs from './local_nav_breadcrumbs';
import breadcrumbsSource from '!!raw!./local_nav_breadcrumbs';
const breadcrumbsHtml = renderToHtml(Breadcrumbs);

import Search from './local_nav_search';
import searchSource from '!!raw!./local_nav_search';
const searchHtml = renderToHtml(Search);

import SearchError from './local_nav_search_error';
import searchErrorSource from '!!raw!./local_nav_search_error';
const searchErrorHtml = renderToHtml(SearchError);

import MenuItemStates from './local_nav_menu_item_states';
import menuItemStatesSource from '!!raw!./local_nav_menu_item_states';
const menuItemStatesHtml = renderToHtml(MenuItemStates);

import Dropdown from './local_nav_dropdown';
import dropdownSource from '!!raw!./local_nav_dropdown';
const dropdownHtml = renderToHtml(Dropdown);

import DropdownPanels from './local_nav_dropdown_panels';
import dropdownPanelsSource from '!!raw!./local_nav_dropdown_panels';
const dropdownPanelsHtml = renderToHtml(DropdownPanels);

import Tabs from './local_nav_tabs';
import tabsSource from '!!raw!./local_nav_tabs';
const tabsHtml = renderToHtml(Tabs);

const datePickerHtml = require('./local_nav_date_picker.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Simple"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: simpleSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: simpleHtml,
        },
      ]}
    >
      <GuideText>
        Here's a simple LocalNav with a Title in the top left corner and Menu in the top right.
      </GuideText>

      <GuideDemo>
        <Simple />
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <Simple />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Breadcrumbs"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: breadcrumbsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: breadcrumbsHtml,
        },
      ]}
    >
      <GuideText>
        You can replace the Title with Breadcrumbs.
      </GuideText>

      <GuideDemo>
        <Breadcrumbs />
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <Breadcrumbs />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Search"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: searchSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: searchHtml,
        },
      ]}
    >
      <GuideText>
        You can add a Search component for filtering results.
      </GuideText>

      <GuideDemo>
        <Search />
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <Search />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Invalid Search"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: searchErrorSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: searchErrorHtml,
        },
      ]}
    >
      <GuideDemo>
        <SearchError />
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <SearchError />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Selected and disabled Menu Item states"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: menuItemStatesSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: menuItemStatesHtml,
        },
      ]}
    >
      <GuideText>
        When the user selects a Menu Item, additional content can be displayed inside of a Dropdown.
      </GuideText>

      <GuideText>
        Menu Items can also be disabled, in which case they become non-interactive.
      </GuideText>

      <GuideDemo>
        <MenuItemStates />
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <MenuItemStates />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Dropdown"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: dropdownSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: dropdownHtml,
        },
      ]}
    >
      <GuideText>
        Selecting a Menu Item will commonly result in an open Dropdown.
      </GuideText>

      <GuideDemo>
        <Dropdown />
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <Dropdown />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Dropdown panels"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: dropdownPanelsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: dropdownPanelsHtml,
        },
      ]}
    >
      <GuideText>
        You can split the Dropdown into side-by-side Panels.
      </GuideText>

      <GuideDemo>
        <DropdownPanels />
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <DropdownPanels />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Tabs"
      source={[
        {
          type: GuideSectionTypes.JS,
          code: tabsSource,
        },
        {
          type: GuideSectionTypes.HTML,
          code: tabsHtml,
        },
      ]}
    >
      <GuideText>
        You can display Tabs for navigating local content.
      </GuideText>

      <GuideDemo>
        <Tabs />
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <Tabs />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="DatePicker"
      source={[{
        type: GuideSectionTypes.HTML,
        code: datePickerHtml,
      }]}
    >
      <GuideDemo
        html={datePickerHtml}
      />

      <GuideDemo
        html={datePickerHtml}
        isDarkTheme={true}
      />
    </GuideSection>
  </GuidePage>
);

