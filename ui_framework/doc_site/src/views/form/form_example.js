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

import Form from './form';
const formSource = require('!!raw!./form');
const formHtml = renderToHtml(Form);

import FormValidation from './form_validation';
const formValidationSource = require('!!raw!./form_validation');
const formValidationHtml = renderToHtml(FormValidation);

import FormPopover from './form_popover';
const formPopoverSource = require('!!raw!./form_popover');
const formPopoverHtml = renderToHtml(FormPopover);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Form"
      source={[{
        type: GuideSectionTypes.JS,
        code: formSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formHtml,
      }]}
    >
      <GuideText>
        Every form element.
      </GuideText>

      <GuideDemo>
        <Form />
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
