import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCode,
} from '../../../../components';

import ContextMenu from './context_menu';
const contextMenuSource = require('!!raw!./context_menu');
const contextMenuHtml = renderToHtml(ContextMenu);

import ContextMenuSimple from './context_menu_simple';
const contextMenuSimpleSource = require('!!raw!./context_menu_simple');
const contextMenuSimpleHtml = renderToHtml(ContextMenuSimple);

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
      text={
        <p>
          <KuiCode>KuiContextMenu</KuiCode> is a nested menu system useful
          for navigating complicated trees. It lives within a <KuiCode>KuiPopover</KuiCode>
          which itself can be wrapped around any component (like a button in this example).
        </p>
      }
      demo={
        <ContextMenu />
      }
    />
    <GuideSection
      title="Context menu doesn't need to nest"
      source={[{
        type: GuideSectionTypes.JS,
        code: contextMenuSimpleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: contextMenuSimpleHtml,
      }]}
      text={
        <p>
          Context menus can be used for simple, non-nested menus as well. The below
          pagination example has no nesting and no title.
        </p>

     }
      demo={
        <ContextMenuSimple />
     }
    />
  </GuidePage>
);
