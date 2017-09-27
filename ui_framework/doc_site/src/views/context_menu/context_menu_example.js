import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import ContextMenu from './context_menu';
const contextMenuSource = require('!!raw!./context_menu');
const contextMenuHtml = renderToHtml(ContextMenu);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Context Menu"
      source={[{
        type: GuideSectionTypes.JS,
        code: contextMenuSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: contextMenuHtml,
      }]}
    >
      <GuideText>
        <GuideCode>KuiContextMenu</GuideCode> is a nested menu system useful
        for navigating complicated trees. It lives within a <GuideCode>KuiPopover</GuideCode>
        which itself can be wrapped around any component (like a button in this example).
      </GuideText>

      <GuideDemo style={{ height: 280 }}>
        <ContextMenu />
      </GuideDemo>

      <GuideDemo isDarkTheme={true} style={{ height: 280 }}>
        <ContextMenu />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
