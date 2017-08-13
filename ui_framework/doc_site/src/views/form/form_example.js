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

import FormComponents from './form_components';
const formComponentsSource = require('!!raw!./form_components');
const formComponentsHtml = renderToHtml(FormComponents);

import FormRows from './form_rows';
const formRowsSource = require('!!raw!./form_rows');
const formRowsHtml = renderToHtml(FormRows);

import Validation from './validation';
const validationSource = require('!!raw!./validation');
const validationHtml = renderToHtml(Validation);

import FormPopover from './form_popover';
const formPopoverSource = require('!!raw!./form_popover');
const formPopoverHtml = renderToHtml(FormPopover);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Form components"
      source={[{
        type: GuideSectionTypes.JS,
        code: formComponentsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formComponentsHtml,
      }]}
    >
      <GuideDemo>
        <FormComponents />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Form rows"
      source={[{
        type: GuideSectionTypes.JS,
        code: formRowsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formRowsHtml,
      }]}
    >
      <GuideText>
        Use the <GuideCode>FormRow</GuideCode> component to easily associate form components with
        labels, help text, and error text.
      </GuideText>

      <GuideDemo>
        <FormRows />
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
      title="Validation"
      source={[{
        type: GuideSectionTypes.JS,
        code: validationSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: validationHtml,
      }]}
    >
      <GuideText>
        Validation is achieved by applying <GuideCode>isInvalid</GuideCode> and optionally <GuideCode>error</GuideCode> props
        onto the <GuideCode>KuiForm</GuideCode> or <GuideCode>KuiFormRow</GuideCode> components. Errors are optional
        and are passed as an array in case you need to list many errors.
      </GuideText>

      <GuideDemo>
        <Validation />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
