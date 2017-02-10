import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

const infoHtml = require('./status_text_info.html');
const successHtml = require('./status_text_success.html');
const warningHtml = require('./status_text_warning.html');
const errorHtml = require('./status_text_error.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Info"
      source={[{
        type: GuideSectionTypes.HTML,
        code: infoHtml,
      }]}
    >
      <GuideDemo
        html={infoHtml}
      />
    </GuideSection>

    <GuideSection
      title="Success"
      source={[{
        type: GuideSectionTypes.HTML,
        code: successHtml,
      }]}
    >
      <GuideDemo
        html={successHtml}
      />
    </GuideSection>

    <GuideSection
      title="Warning"
      source={[{
        type: GuideSectionTypes.HTML,
        code: warningHtml,
      }]}
    >
      <GuideDemo
        html={warningHtml}
      />
    </GuideSection>

    <GuideSection
      title="Error"
      source={[{
        type: GuideSectionTypes.HTML,
        code: errorHtml,
      }]}
    >
      <GuideDemo
        html={errorHtml}
      />
    </GuideSection>
  </GuidePage>
);
