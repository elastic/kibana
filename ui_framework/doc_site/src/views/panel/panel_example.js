import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const panelHtml = require('./panel.html');
const panelWithHeaderHtml = require('./panel_with_header.html');
const panelWithHeaderSectionsHtml = require('./panel_with_header_sections.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Panel"
      source={[{
        type: GuideSectionTypes.HTML,
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
        type: GuideSectionTypes.HTML,
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

    <GuideSection
      title="Panel with PanelHeaderSections"
      source={[{
        type: GuideSectionTypes.HTML,
        code: panelWithHeaderSectionsHtml,
      }]}
    >
      <GuideText>
        PanelHeaders can have sections.
      </GuideText>

      <GuideDemo
        html={panelWithHeaderSectionsHtml}
      />
    </GuideSection>
  </GuidePage>
);
