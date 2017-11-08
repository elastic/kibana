import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const assistedInputHtml = require('./assisted_input.html');

const searchInputHtml = require('./search_input.html');

const staticInputHtml = require('./static_input.html');

const Label = require('./label');
const labelSource = require('!!raw-loader!./label');
const labelHtml = renderToHtml(Label);

const TextInput = require('./text_input');
const textInputSource = require('!!raw-loader!./text_input');
const textInputHtml = renderToHtml(TextInput, { id: '1' });

const TextArea = require('./text_area');
const textAreaSource = require('!!raw-loader!./text_area');
const textAreaHtml = renderToHtml(TextArea);

const TextAreaNonResizable = require('./text_area_non_resizable');
const textAreaNonResizableSource = require('!!raw-loader!./text_area_non_resizable');
const textAreaNonResizableHtml = renderToHtml(TextAreaNonResizable);

const Select = require('./select');
const selectSource = require('!!raw-loader!./select');
const selectHtml = renderToHtml(Select);

const CheckBox = require('./check_box');
const checkBoxSource = require('!!raw-loader!./check_box');
const checkBoxHtml = renderToHtml(CheckBox);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Label"
      source={[{
        type: GuideSectionTypes.JS,
        code: labelSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: labelHtml,
      }]}
    >

      <GuideText>
        Never forget to label every input element. You can either
        use a <GuideCode>label</GuideCode> element with a <GuideCode>for</GuideCode> attribute
        referencing the <GuideCode>id</GuideCode> of the input field, wrap the <GuideCode>input</GuideCode> field
        within the <GuideCode>label</GuideCode> element or use <GuideCode>aria-label</GuideCode> or <GuideCode>aria-labelledby</GuideCode>.
      </GuideText>

      <GuideText>
        For the sake of simplicity we haven&rsquo;t labeled the input elements on
        this page correctly.
      </GuideText>

      <GuideDemo>
        <Label/>
      </GuideDemo>

    </GuideSection>

    <GuideSection
      title="TextInput"
      source={[{
        type: GuideSectionTypes.JS,
        code: textInputSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: textInputHtml,
      }]}
    >
      <GuideDemo>
        <TextInput/>
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <TextInput/>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="AssistedInput"
      source={[{
        type: GuideSectionTypes.HTML,
        code: assistedInputHtml,
      }]}
    >
      <GuideText>
        <strong>Note:</strong> You have to specify right-side padding using a custom class or
        inline style to keep the input text from overlapping with the assistance content.
        Use <GuideCode>em</GuideCode> units for this padding so that it scales appropriately if the
        user changes their root font-size.
      </GuideText>

      <GuideDemo
        html={assistedInputHtml}
      />

      <GuideDemo
        html={assistedInputHtml}
        isDarkTheme
      />
    </GuideSection>

    <GuideSection
      title="SearchInput"
      source={[{
        type: GuideSectionTypes.HTML,
        code: searchInputHtml,
      }]}
    >
      <GuideDemo
        html={searchInputHtml}
      />

      <GuideDemo
        html={searchInputHtml}
        isDarkTheme
      />
    </GuideSection>

    <GuideSection
      title="StaticInput"
      source={[{
        type: GuideSectionTypes.HTML,
        code: staticInputHtml,
      }]}
    >
      <GuideText>
        Use StaticInput to display dynamic content in a form which the user isn&rsquo;t allowed to edit.
      </GuideText>

      <GuideDemo
        html={staticInputHtml}
      />
    </GuideSection>

    <GuideSection
      title="TextArea"
      source={[{
        type: GuideSectionTypes.JS,
        code: textAreaSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: textAreaHtml,
      }]}
    >
      <GuideDemo>
        <TextArea/>
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <TextArea/>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="TextArea, non-resizable"
      source={[{
        type: GuideSectionTypes.JS,
        code: textAreaNonResizableSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: textAreaNonResizableHtml,
      }]}
    >
      <GuideDemo>
        <TextAreaNonResizable/>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="CheckBox"
      source={[{
        type: GuideSectionTypes.JS,
        code: checkBoxSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: checkBoxHtml,
      }]}
    >
      <GuideDemo>
        <CheckBox/>
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <CheckBox/>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Select"
      source={[{
        type: GuideSectionTypes.JS,
        code: selectSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: selectHtml,
      }]}
    >
      <GuideDemo>
        <Select/>
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <Select/>
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
