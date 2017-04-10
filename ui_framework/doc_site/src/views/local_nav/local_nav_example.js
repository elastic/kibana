import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const simpleHtml = require('./local_nav_simple.html');
const breadcrumbsHtml = require('./local_nav_breadcrumbs.html');
const searchHtml = require('./local_nav_search.html');
const searchErrorHtml = require('./local_nav_search_error.html');
const menuItemStatesHtml = require('./local_nav_menu_item_states.html');
const dropdownHtml = require('./local_nav_dropdown.html');
const dropdownPanelsHtml = require('./local_nav_dropdown_panels.html');
const tabsHtml = require('./local_nav_tabs.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Simple"
      source={[{
        type: GuideSectionTypes.HTML,
        code: simpleHtml,
      }]}
    >
      <GuideText>
        Here's a simple LocalNav with a Title in the top left corner and Menu in the top right.
      </GuideText>

      <GuideDemo
        html={simpleHtml}
      />

      <GuideDemo
        html={simpleHtml}
        isDarkTheme={true}
      />
    </GuideSection>

    <GuideSection
      title="Breadcrumbs"
      source={[{
        type: GuideSectionTypes.HTML,
        code: breadcrumbsHtml,
      }]}
    >
      <GuideText>
        You can replace the Title with Breadcrumbs.
      </GuideText>

      <GuideDemo
        html={breadcrumbsHtml}
      />

      <GuideDemo
        html={breadcrumbsHtml}
        isDarkTheme={true}
      />
    </GuideSection>

    <GuideSection
      title="Search"
      source={[{
        type: GuideSectionTypes.HTML,
        code: searchHtml,
      }]}
    >
      <GuideText>
        You can add a Search component for filtering results.
      </GuideText>

      <GuideDemo
        html={searchHtml}
      />

      <GuideDemo
        html={searchHtml}
        isDarkTheme={true}
      />
    </GuideSection>

    <GuideSection
      title="Invalid Search"
      source={[{
        type: GuideSectionTypes.HTML,
        code: searchErrorHtml,
      }]}
    >
      <GuideDemo
        html={searchErrorHtml}
      />

      <GuideDemo
        html={searchErrorHtml}
        isDarkTheme={true}
      />
    </GuideSection>

    <GuideSection
      title="Selected and disabled Menu Item states"
      source={[{
        type: GuideSectionTypes.HTML,
        code: menuItemStatesHtml,
      }]}
    >
      <GuideText>
        When the user selects a Menu Item, additional content can be displayed inside of a Dropdown.
      </GuideText>

      <GuideText>
        Menu Items can also be disabled, in which case they become non-interactive.
      </GuideText>

      <GuideDemo
        html={menuItemStatesHtml}
      />

      <GuideDemo
        html={menuItemStatesHtml}
        isDarkTheme={true}
      />
    </GuideSection>

    <GuideSection
      title="Dropdown"
      source={[{
        type: GuideSectionTypes.HTML,
        code: dropdownHtml,
      }]}
    >
      <GuideText>
        Selecting a Menu Item will commonly result in an open Dropdown.
      </GuideText>

      <GuideDemo
        html={dropdownHtml}
      />

      <GuideDemo
        html={dropdownHtml}
        isDarkTheme={true}
      />
    </GuideSection>

    <GuideSection
      title="Dropdown panels"
      source={[{
        type: GuideSectionTypes.HTML,
        code: dropdownPanelsHtml,
      }]}
    >
      <GuideText>
        You can split the Dropdown into side-by-side Panels.
      </GuideText>

      <GuideDemo
        html={dropdownPanelsHtml}
      />

      <GuideDemo
        html={dropdownPanelsHtml}
        isDarkTheme={true}
      />
    </GuideSection>

    <GuideSection
      title="Tabs"
      source={[{
        type: GuideSectionTypes.HTML,
        code: tabsHtml,
      }]}
    >
      <GuideText>
        You can display Tabs for navigating local content.
      </GuideText>

      <GuideDemo
        html={tabsHtml}
      />

      <GuideDemo
        html={tabsHtml}
        isDarkTheme={true}
      />
    </GuideSection>
  </GuidePage>
);

