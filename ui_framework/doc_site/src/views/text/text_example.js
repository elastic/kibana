import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCode,
} from '../../../../components';

import Text from './text';
const textSource = require('!!raw!./text');
const textHtml = renderToHtml(Text);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Text"
      source={[{
        type: GuideSectionTypes.JS,
        code: textSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: textHtml,
      }]}
      text={
        <p>
          <KuiCode>KuiText</KuiCode> is a generic catchall wrapper that will apply
          our standard typography styling and spacing to naked HTML. Because of
          its forced style it <strong>only accepts raw HTML</strong> and can
          not / should not be used to wrap React components (which would break
          their styling).
        </p>
      }
      demo={
        <Text />
      }
    />
  </GuidePage>
);
