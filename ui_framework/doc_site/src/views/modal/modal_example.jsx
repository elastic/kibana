import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const modalHtml = require('./modal.html');
const modalOverlayHtml = require('./modal_overlay.html');
const modalOverlayJs = require('raw!./modal_overlay.js');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Modal"
      source={[{
        type: GuideSectionTypes.HTML,
        code: modalHtml,
      }]}
    >
      <GuideDemo
        html={modalHtml}
      />
    </GuideSection>

    <GuideSection
      title="ModalOverlay"
      source={[{
        type: GuideSectionTypes.HTML,
        code: modalOverlayHtml,
      }, {
        type: GuideSectionTypes.JS,
        code: modalOverlayJs,
      }]}
    >
      <GuideDemo
        html={modalOverlayHtml}
        js={modalOverlayJs}
      />
    </GuideSection>
  </GuidePage>
);
