import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const infoHtml = require('./info_panel_info.html');
const successHtml = require('./info_panel_success.html');
const warningHtml = require('./info_panel_warning.html');
const errorHtml = require('./info_panel_error.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Info"
      source={[{
        type: GuideSectionTypes.HTML,
        code: infoHtml,
      }]}
    >
      <GuideText>
        Use this InfoPanel to generally inform the user.
      </GuideText>

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
      <GuideText>
        Use this InfoPanel to notify the user of an action successfully completing.
      </GuideText>

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
      <GuideText>
        Use this InfoPanel to warn the user against decisions they might regret.
      </GuideText>

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
      <GuideText>
        Use this InfoPanel to let the user know something went wrong.
      </GuideText>

      <GuideDemo
        html={errorHtml}
      />
    </GuideSection>
  </GuidePage>
);
