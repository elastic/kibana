import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import FieldGroup from './field_group';
const fieldGroupSource = require('!!raw-loader!./field_group');
const fieldGroupHtml = renderToHtml(FieldGroup);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="FieldGroup"
      source={[{
        type: GuideSectionTypes.JS,
        code: fieldGroupSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: fieldGroupHtml,
      }]}
    >
      <GuideDemo>
        <FieldGroup />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
