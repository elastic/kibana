import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import Link from './link';
const linkSource = require('!!raw!./link');
const linkHtml = renderToHtml(Link);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Link"
      source={[{
        type: GuideSectionTypes.JS,
        code: linkSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: linkHtml,
      }]}
    >
      <GuideDemo>
        <Link />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
