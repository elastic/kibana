import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuideSandbox,
  GuideSandboxCodeToggle,
  GuideSectionTypes,
} from '../../components';

import Kibana from './kibana';
const kibanaSource = require('!!raw!./kibana');
const kibanaHtml = renderToHtml(Kibana);

export default props => (
  <GuideSandbox>
    <GuideDemo isFullScreen={true}>
      <Kibana />
    </GuideDemo>

    <GuideSandboxCodeToggle
      title={props.route.name}
      source={[{
        type: GuideSectionTypes.JS,
        code: kibanaSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: kibanaHtml,
      }]}
    />
  </GuideSandbox>
);
