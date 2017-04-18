import React from 'react';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const titleHtml = require('./title.html');
const subTitleHtml = require('./sub_title.html');
const textTitleHtml = require('./text_title.html');
const textHtml = require('./text.html');
const subTextHtml = require('./sub_text.html');
const subduedHtml = require('./subdued_type.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Title"
      source={[{
        type: GuideSectionTypes.HTML,
        code: titleHtml,
      }]}
    >
      <GuideText>
        Works well with an <GuideCode>h1</GuideCode>.
      </GuideText>

      <GuideDemo
        html={titleHtml}
      />
    </GuideSection>

    <GuideSection
      title="SubTitle"
      source={[{
        type: GuideSectionTypes.HTML,
        code: subTitleHtml,
      }]}
    >
      <GuideText>
        Works well with an <GuideCode>h2</GuideCode>.
      </GuideText>

      <GuideDemo
        html={subTitleHtml}
      />
    </GuideSection>

    <GuideSection
      title="TextTItle"
      source={[{
        type: GuideSectionTypes.HTML,
        code: textTitleHtml,
      }]}
    >
      <GuideText>
        Titles for paragraphs.
      </GuideText>

      <GuideDemo
        html={textTitleHtml}
      />
    </GuideSection>

    <GuideSection
      title="Text"
      source={[{
        type: GuideSectionTypes.HTML,
        code: textHtml,
      }]}
    >
      <GuideText>
        Works well with a <GuideCode>p</GuideCode>.
      </GuideText>

      <GuideDemo
        html={textHtml}
      />
    </GuideSection>

    <GuideSection
      title="SubText"
      source={[{
        type: GuideSectionTypes.HTML,
        code: subTextHtml,
      }]}
    >
      <GuideText>
        For really unimportant information.
      </GuideText>

      <GuideDemo
        html={subTextHtml}
      />
    </GuideSection>

    <GuideSection
      title="Subdued type"
      source={[{
        type: GuideSectionTypes.HTML,
        code: subduedHtml,
      }]}
    >
      <GuideText>
        You can drop type a half-step down in the type hierarchy.
      </GuideText>

      <GuideDemo
        html={subduedHtml}
      />
    </GuideSection>
  </GuidePage>
);
