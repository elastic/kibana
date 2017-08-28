import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import Kibana from './kibana';
const kibanaSource = require('!!raw!./kibana');
const kibanaHtml = renderToHtml(Kibana);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title={props.route.name}
      source={[{
        type: GuideSectionTypes.JS,
        code: kibanaSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: kibanaHtml,
      }]}
      text={
        <p>A demo showing off a fully constructed page.</p>
      }
      demo={
        <Kibana />
      }
    />
  </GuidePage>
);
