import React from 'react';

import { renderToHtml } from '../../services';

import {
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
        Description needed: how to use the ContextMenu component.
      </GuideText>

      <GuideDemo>
        <ContextMenu />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
