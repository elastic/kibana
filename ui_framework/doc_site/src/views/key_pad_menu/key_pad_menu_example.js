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
      text={
        <p>
          The KeyPadMenu component presents KeyPadMenuItems in a tiled format, with a fixed width which will
          accommodate three items and then wrap.
        </p>
      }
      demo={
        <KeyPadMenu />
      }
    />

    <GuideSection
      title="KeyPadMenuItemButton"
      source={[{
        type: GuideSectionTypes.JS,
        code: keyPadMenuItemButtonSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: keyPadMenuItemButtonHtml,
      }]}
      text={
        <p>
          The KeyPadMenuItem component is a link by default, but you can swap it out for a
          KeyPadMenuItemButton if you want <KuiCode>onClick</KuiCode> behavior.
        </p>
      }
      demo={
        <KeyPadMenuItemButton />
      }
    />
  </GuidePage>
);
