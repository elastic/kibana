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

import { ModalExample } from './modal';
const modalSource = require('!!raw-loader!./modal');
const modalHtml = renderToHtml(ModalExample);

import { ConfirmModalExample } from './confirm_modal';
const confirmModalSource = require('!!raw-loader!./confirm_modal');
const confirmModalHtml = renderToHtml(ConfirmModalExample);

export default props => (
  <GuidePage title={props.route.name}>

    <GuideSection
      title="Confirmation Modal"
      source={[{
        type: GuideSectionTypes.JS,
        code: modalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: modalHtml,
      }]}
    >
      <GuideText>
        Use a <GuideCode>KuiModal</GuideCode> to temporarily escape the current UX and create
        another UX within it.
      </GuideText>

      <GuideDemo>
        <ModalExample />
      </GuideDemo>

      <GuideDemo isDarkTheme>
        <ModalExample />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Pop up Confirmation Modal with Overlay"
      source={[{
        type: GuideSectionTypes.JS,
        code: confirmModalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: confirmModalHtml,
      }]}
    >
      <GuideDemo>
        <ConfirmModalExample />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
