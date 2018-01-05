import React from 'react';

import { Link } from 'react-router';

import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import PanelSimple from './panel_simple';
const panelSimpleSource = require('!!raw-loader!./panel_simple');
const panelSimpleHtml = renderToHtml(PanelSimple);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="PanelSimple"
      source={[{
        type: GuideSectionTypes.JS,
        code: panelSimpleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: panelSimpleHtml,
      }]}
    >
      <GuideText>
        <GuideCode>PanelSimple</GuideCode> is a simple wrapper component to add
        depth to a contained layout. It it commonly used as a base for
        other larger components like <Link className="guideLink" to="/popover">Popover</Link>.
      </GuideText>

      <GuideDemo>
        <PanelSimple />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
