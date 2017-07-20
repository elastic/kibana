import React from 'react';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const iconHtml = require('./icon.html');
const infoHtml = require('./icon_info.html');
const basicHtml = require('./icon_basic.html');
const successHtml = require('./icon_success.html');
const warningHtml = require('./icon_warning.html');
const errorHtml = require('./icon_error.html');
const inactiveHtml = require('./icon_inactive.html');
const spinnerHtml = require('./icon_spinner.html');
const spinnerJs = require('raw!./icon_spinner.js');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Icon"
      source={[{
        type: GuideSectionTypes.HTML,
        code: iconHtml,
      }]}
    >
      <GuideText>
        Use the <GuideCode>icon</GuideCode> class instead of the <GuideCode>fa</GuideCode> class for
        FontAwesome icons. This will make it easier for us to migrate away from FontAwesome.
      </GuideText>

      <GuideDemo
        html={iconHtml}
      />
    </GuideSection>

    <GuideSection
      title="Info"
      source={[{
        type: GuideSectionTypes.HTML,
        code: infoHtml,
      }]}
    >
      <GuideText>
        Use this Icon to denote useful information.
      </GuideText>

      <GuideDemo
        html={infoHtml}
      />
    </GuideSection>

    <GuideSection
      title="Basic"
      source={[{
        type: GuideSectionTypes.HTML,
        code: basicHtml,
      }]}
    >
      <GuideText>
        Use this Icon when you don't want to communicate any particular meaning with the icon's
        color.
      </GuideText>

      <GuideDemo
        html={basicHtml}
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
        Use this Icon to denote the successful completion of an action, e.g. filling out a form
        field correctly or a successful API request.
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
        Use this Icon to denote an irregularity or potential problems.
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
        Use this Icon to denote a failed attempt at an action, e.g. an invalid form field or an API
        error.
      </GuideText>

      <GuideDemo
        html={errorHtml}
      />
    </GuideSection>

    <GuideSection
      title="Inactive"
      source={[{
        type: GuideSectionTypes.HTML,
        code: inactiveHtml,
      }]}
    >
      <GuideText>
        Use this Icon to denote a disabled, inactive, off, offline, or asleep status.
      </GuideText>

      <GuideDemo
        html={inactiveHtml}
      />
    </GuideSection>

    <GuideSection
      title="Spinner"
      source={[{
        type: GuideSectionTypes.HTML,
        code: spinnerHtml,
      }]}
    >
      <GuideText>
        You can use Icons to represent a loading and successfully-loaded state.
      </GuideText>

      <GuideDemo
        html={spinnerHtml}
        js={spinnerJs}
      />
    </GuideSection>
  </GuidePage>
);
