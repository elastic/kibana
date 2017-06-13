import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const panelHtml = require('./panel.html');
const panelWithToolBarHtml = require('./panel_with_toolbar.html');
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

    <GuideSection
      title="Panel with Toolbar"
      source={[{
        type: GuideSectionTypes.HTML,
        code: panelWithToolBarHtml,
      }]}
    >
      <GuideText>
        Panels can live within toolbar sections. This is normally used as replacement for an empty table.
      </GuideText>

      <GuideDemo
        html={panelWithToolBarHtml}
      />
    </GuideSection>
  </GuidePage>
);
