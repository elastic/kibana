import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuideCode,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import FieldText from './field_text';
const fieldTextSource = require('!!raw!./field_text');
const fieldTextHtml = renderToHtml(FieldText);

import FormEverything from './form_everything';
const formEverythingSource = require('!!raw!./form_everything');
const formEverythingHtml = renderToHtml(FormEverything);

import FormValidation from './form_validation';
const formValidationSource = require('!!raw!./form_validation');
const formValidationHtml = renderToHtml(FormValidation);

import FormPopover from './form_popover';
const formPopoverSource = require('!!raw!./form_popover');
const formPopoverHtml = renderToHtml(FormPopover);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Component structure"
      source={[{
        type: GuideSectionTypes.JS,
        code: fieldTextSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: fieldTextHtml,
      }]}
    >
      <GuideText>
        Each form input has a base component to cover generic use cases. These are raw HTML elements with only basic styling.
        Additionally, you can wrap any of these elements with a <GuideCode>FormRow</GuideCode> which gives you optional
        prebuilt labels, help text and validation.  Below is an example showing the <GuideCode>FieldText</GuideCode> component
        in a bunch of configurations, but they all act roughly the same. Farther down in the docs you can see an example
        showing every form element and their individual prop settings (which mirror their HTML counterparts).
      </GuideText>

      <GuideDemo>
        <FieldText />
      </GuideDemo>
    </GuideSection>
    <GuideSection
      title="Form component examples"
      source={[{
        type: GuideSectionTypes.JS,
        code: formEverythingSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formEverythingHtml,
      }]}
    >
      <GuideText>
        This example shows every form element in use and showcases a variety of styles. Note that each one of these elements is wrapped
        by <GuideCode>FormRow</GuideCode>.
      </GuideText>

      <GuideDemo>
        <FormEverything />
      </GuideDemo>
    </GuideSection>
    <GuideSection
      title="Form in popover"
      source={[{
        type: GuideSectionTypes.JS,
        code: formPopoverSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formPopoverHtml,
      }]}
    >
      <GuideText>
        Forms can be placed within popovers and should scale accordingly.
      </GuideText>

      <GuideDemo>
        <FormPopover />
      </GuideDemo>
    </GuideSection>
    <GuideSection
      title="Form validation"
      source={[{
        type: GuideSectionTypes.JS,
        code: formValidationSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formValidationHtml,
      }]}
    >
      <GuideText>
        Validation is achieved by applying <GuideCode>invalid</GuideCode> and optionally <GuideCode>error</GuideCode> props
        onto the <GuideCode>KuiForm</GuideCode> or <GuideCode>KuiFormRow</GuideCode> components. Errors are optional
        and are passed as an array in case you need to list many errors.
      </GuideText>

      <GuideDemo>
        <FormValidation />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
