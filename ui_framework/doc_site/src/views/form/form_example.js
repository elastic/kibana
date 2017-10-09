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

const textInputHtml = require('./text_input.html');
const labelHtml = require('./label.html');
const assistedInputHtml = require('./assisted_input.html');
const searchInputHtml = require('./search_input.html');
const staticInputHtml = require('./static_input.html');
const textAreaHtml = require('./text_area.html');
const textAreaNonResizableHtml = require('./text_area_non_resizable.html');
const checkBoxHtml = require('./check_box.html');
const selectHtml = require('./select.html');

const Label = require('./label');
const labelSource2 = require('!!raw!./label');
const labelHtml2 = renderToHtml(Label);

const TextInput = require('./text_input');
const textInputSource2 = require('!!raw!./text_input');
const textInputHtml2 = renderToHtml(TextInput,{ id:'1' });

const TextArea = require('./text_area');
const textAreaSource2 = require('!!raw!./text_area');
const textAreaHtml2 = renderToHtml(TextArea);

const TextAreaNonResizable = require('./text_area_non_resizable');
const textAreaNonResizableSource2 = require('!!raw!./text_area_non_resizable');
const textAreaNonResizableHtml2 = renderToHtml(TextAreaNonResizable);

const Select = require('./select');
const selectSource2 = require('!!raw!./select');
const selectHtml2 = renderToHtml(Select);

const CheckBox = require('./check_box');
const checkBoxSource2 = require('!!raw!./check_box');
const checkBoxHtml2 = renderToHtml(CheckBox);


export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Label"
      source={[{
        type: GuideSectionTypes.HTML,
        code: labelHtml,
      }]}
    >

      <GuideText>
        Never forget to label every input element. You can either
        use a <code>label</code> element with a <code>for</code> attribute
        referencing the <code>id</code> of the input field, wrap the <code>input</code> field
        within the <code>label</code> element or use <code>aria-label</code> or <code>aria-labelledby</code>.
      </GuideText>

      <GuideText>
        For the sake of simplicity we haven&rsquo;t labeled the input elements on
        this page correctly.
      </GuideText>

      <GuideDemo
        html={labelHtml}
      />

    </GuideSection>

    <GuideSection
      title="Label React Component"
      source={[{
        type: GuideSectionTypes.JS,
        code: labelSource2,
      }, {
        type: GuideSectionTypes.HTML,
        code: labelHtml2,
      }]}
    >

      <GuideText>
        Never forget to label every input element. You can either
        use a <code>label</code> element with a <code>for</code> attribute
        referencing the <code>id</code> of the input field, wrap the <code>input</code> field
        within the <code>label</code> element or use <code>aria-label</code> or <code>aria-labelledby</code>.
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
        type: GuideSectionTypes.HTML,
        code: textInputHtml,
      }]}
    >
      <GuideDemo
        html={textInputHtml}
      />

      <GuideDemo
        html={textInputHtml}
        isDarkTheme
      />
    </GuideSection>

    <GuideSection
      title="TextInput React Component"
      source={[{
        type: GuideSectionTypes.JS,
        code: textInputSource2,
      }, {
        type: GuideSectionTypes.HTML,
        code: textInputHtml2,
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
        type: GuideSectionTypes.HTML,
        code: textAreaHtml,
      }]}
    >
      <GuideDemo
        html={textAreaHtml}
      />

      <GuideDemo
        html={textAreaHtml}
        isDarkTheme
      />
    </GuideSection>

    <GuideSection
      title="TextArea, non-resizable"
      source={[{
        type: GuideSectionTypes.HTML,
        code: textAreaNonResizableHtml,
      }]}
    >
      <GuideDemo
        html={textAreaNonResizableHtml}
      />
    </GuideSection>

    <GuideSection
      title="TextArea React Component"
      source={[{
        type: GuideSectionTypes.JS,
        code: textAreaSource2,
      }, {
        type: GuideSectionTypes.HTML,
        code: textAreaHtml2,
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
      title="TextArea, non-resizable React Component"
      source={[{
        type: GuideSectionTypes.JS,
        code: textAreaNonResizableSource2,
      }, {
        type: GuideSectionTypes.HTML,
        code: textAreaNonResizableHtml2,
      }]}
    >
      <GuideDemo>
        <TextAreaNonResizable/>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="CheckBox"
      source={[{
        type: GuideSectionTypes.HTML,
        code: checkBoxHtml,
      }]}
    >
      <GuideDemo
        html={checkBoxHtml}
      />

      <GuideDemo
        html={checkBoxHtml}
        isDarkTheme
      />
    </GuideSection>

    <GuideSection
      title="CheckBox React Component"
      source={[{
        type: GuideSectionTypes.JS,
        code: checkBoxSource2,
      }, {
        type: GuideSectionTypes.HTML,
        code: checkBoxHtml2,
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
        type: GuideSectionTypes.HTML,
        code: selectHtml,
      }]}
    >
      <GuideDemo
        html={selectHtml}
      />

      <GuideDemo
        html={selectHtml}
        isDarkTheme
      />
    </GuideSection>

    <GuideSection
      title="Select React Component"
      source={[{
        type: GuideSectionTypes.JS,
        code: selectSource2,
      }, {
        type: GuideSectionTypes.HTML,
        code: selectHtml2,
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
