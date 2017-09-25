import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCallOut,
  KuiText,
  KuiCode,
  KuiSpacer,
} from '../../../../components';

import Spacer from './spacer';
const spacerSource = require('!!raw!./spacer');
const spacerHtml = renderToHtml(Spacer);

export default props => (
  <GuidePage title={props.route.name}>
    <KuiCallOut
      title="Try not to stuff these in loops"
      type="warning"
    >
      <KuiText size="s">
        <p>
          This component is handy for setting space between two different
          components, be it a block level element or two pieces of isolated text. You
          should not use it in loops of repeatable components. In those situations
          it is almost always more preferable to define the spacing on the component
          itself.
        </p>
      </KuiText>
    </KuiCallOut>
    <KuiSpacer size="l" />
    <GuideSection
      title="Spacer"
      source={[{
        type: GuideSectionTypes.JS,
        code: spacerSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: spacerHtml,
      }]}
      text={
        <p>
          The <KuiCode>Spacer</KuiCode> component is a fancy break tag. Use
          it to add vertical space between items. Please do not stack them.
        </p>
      }
      demo={
        <div className="guideDemo__highlightSpacer">
          <Spacer />
        </div>
      }
    />
  </GuidePage>
);
