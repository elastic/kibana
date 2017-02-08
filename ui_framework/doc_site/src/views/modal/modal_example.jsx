import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
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
        type: GuideSection.TYPES.HTML,
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
        type: GuideSection.TYPES.HTML,
        code: modalOverlayHtml,
      }, {
        type: GuideSection.TYPES.JS,
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
