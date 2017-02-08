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

const panelHtml = require('./panel.html');
const panelWithHeaderHtml = require('./panel_with_header.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Panel"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: panelHtml,
      }]}
    >
      <GuideDemo
        html={panelHtml}
      />
    </GuideSection>

    <GuideSection
      title="Panel with PanelHeader"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: panelWithHeaderHtml,
      }]}
    >
      <GuideText>
        The Panel requires a special class when used with a PanelHeader.
      </GuideText>

      <GuideDemo
        html={panelWithHeaderHtml}
      />
    </GuideSection>
  </GuidePage>
);
