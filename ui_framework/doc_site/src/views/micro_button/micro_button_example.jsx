import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
  GuideText,
} from '../../components';

const microButtonHtml = require('./micro_button.html');
const microButtonGroupHtml = require('./micro_button_group.html');
const microButtonElementsHtml = require('./micro_button_elements.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="MicroButton"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: microButtonHtml,
      }]}
    >
      <GuideText>
        Use MicroButtons for inline actions inside of Table rows.
      </GuideText>

      <GuideDemo
        html={microButtonHtml}
      />
    </GuideSection>

    <GuideSection
      title="MicroButtonGroup"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: microButtonGroupHtml,
      }]}
    >
      <GuideText>
        se the MicroButtonGroup to emphasize the relationships between a set of MicroButtons, and
        differentiate them from MicroButtons outside of the set.
      </GuideText>

      <GuideDemo
        html={microButtonGroupHtml}
      />
    </GuideSection>

    <GuideSection
      title="Element variations"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: microButtonElementsHtml,
      }]}
    >
      <GuideText>
        You can create a MicroButton using a button element or a link.
      </GuideText>

      <GuideDemo
        html={microButtonElementsHtml}
      />
    </GuideSection>
  </GuidePage>
);
