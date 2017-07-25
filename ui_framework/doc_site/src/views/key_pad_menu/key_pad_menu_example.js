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

import KeyPadMenu from './key_pad_menu';
const keyPadMenuSource = require('!!raw!./key_pad_menu');
const keyPadMenuHtml = renderToHtml(KeyPadMenu);

import KeyPadMenuItemButton from './key_pad_menu_item_button';
const keyPadMenuItemButtonSource = require('!!raw!./key_pad_menu_item_button');
const keyPadMenuItemButtonHtml = renderToHtml(KeyPadMenuItemButton);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="KeyPadMenu"
      source={[{
        type: GuideSectionTypes.JS,
        code: keyPadMenuSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: keyPadMenuHtml,
      }]}
    >
      <GuideText>
        The KeyPadMenu component presents KeyPadMenuItems in a tiled format, with a fixed width which will
        accommodate three items and then wrap.
      </GuideText>

      <GuideDemo>
        <KeyPadMenu />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="KeyPadMenuItemButton"
      source={[{
        type: GuideSectionTypes.JS,
        code: keyPadMenuItemButtonSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: keyPadMenuItemButtonHtml,
      }]}
    >
      <GuideText>
        The KeyPadMenuItem component is a link by default, but you can swap it out for a
        KeyPadMenuItemButton if you want <GuideCode>onClick</GuideCode> behavior.
      </GuideText>

      <GuideDemo>
        <KeyPadMenuItemButton />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
