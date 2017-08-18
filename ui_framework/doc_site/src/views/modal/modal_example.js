import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import { StaticConfirmModal } from './static';
const staticConfirmModalSource = require('!!raw!./static');
const staticConfirmModalHtml = renderToHtml(StaticConfirmModal);

import { ConfirmModalExample } from './confirm_modal_example';
const showConfirmModalSource = require('!!raw!./confirm_modal_example');
const showConfirmModalHtml = renderToHtml(ConfirmModalExample);

export default props => (
  <GuidePage title={props.route.name}>

    <GuideSection
      title="Confirmation Modal"
      source={[{
        type: GuideSectionTypes.JS,
        code: staticConfirmModalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: staticConfirmModalHtml,
      }]}
    >
      <GuideDemo>
        <StaticConfirmModal />
      </GuideDemo>
      <GuideDemo isDarkTheme>
        <StaticConfirmModal />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Pop up Confirmation Modal with Overlay"
      source={[{
        type: GuideSectionTypes.JS,
        code: showConfirmModalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: showConfirmModalHtml,
      }]}
    >
      <GuideDemo>
        <ConfirmModalExample />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
