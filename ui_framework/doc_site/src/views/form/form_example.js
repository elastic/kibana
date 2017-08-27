import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import FormControls from './form_controls';
const formControlsSource = require('!!raw!./form_controls');
const formControlsHtml = renderToHtml(FormControls);

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
      title="Form controls"
      source={[{
        type: GuideSectionTypes.JS,
        code: formControlsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formControlsHtml,
      }]}
      text={
        <p>
          These are the base inputs without their labels. If you need labels
          then use the <GuideCode>FormRow</GuideCode> wrapper as explained
          in the next example.
        </p>
      }
      demo={
        <FormControls />
      }
    />

    <GuideSection
      title="Form rows"
      source={[{
        type: GuideSectionTypes.JS,
        code: formRowsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formRowsHtml,
      }]}
      text={
        <p>
          Use the <GuideCode>FormRow</GuideCode> component to easily associate form components with
          labels, help text, and error text.
        </p>
      }
      demo={
        <FormRows />
      }
    />

    <GuideSection
      title="Form in popover"
      source={[{
        type: GuideSectionTypes.JS,
        code: formPopoverSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formPopoverHtml,
      }]}
      text={
        <p>
          Forms can be placed within <GuideCode>KuiPopover</GuideCode> and
          should scale accordingly.
        </p>
      }
      demo={
        <FormPopover />
      }
    />

    <GuideSection
      title="Validation"
      source={[{
        type: GuideSectionTypes.JS,
        code: validationSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: validationHtml,
      }]}
      text={
        <p>
          Validation is achieved by applying <GuideCode>isInvalid</GuideCode>
          and optionally <GuideCode>error</GuideCode> props
          onto the <GuideCode>KuiForm</GuideCode> or <GuideCode>KuiFormRow</GuideCode>
          components. Errors are optional and are passed as an array in case you
          need to list many errors.
        </p>
      }
      demo={
        <Validation />
      }
    />
  </GuidePage>
);
