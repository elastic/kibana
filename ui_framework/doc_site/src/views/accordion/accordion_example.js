import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCode,
} from '../../../../components';

import Accordion from './accordion';
const accordionSource = require('!!raw!./accordion');
const accordionHtml = renderToHtml(Accordion);

import AccordionForm from './accordion_form';
const accordionFormSource = require('!!raw!./accordion_form');
const accordionFormHtml = renderToHtml(AccordionForm);

import AccordionExtra from './accordion_extra';
const accordionExtraSource = require('!!raw!./accordion_extra');
const accordionExtraHtml = renderToHtml(AccordionExtra);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Accordion (unstyled)"
      source={[{
        type: GuideSectionTypes.JS,
        code: accordionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: accordionHtml,
      }]}
      text={
        <div>
          <p>
            <KuiCode>KuiAccordion</KuiCode> is purposely bare so that you can
            put whatever styling you need on it (see the accordion form example). The only
            styling we force on you in the caret, which gives the user an understaning
            that the content will open up.
          </p>
          <p>
            A <KuiCode>buttonContent</KuiCode> prop defines the content of the
            clickable area. On click it will expose the children and animate
            based on the height of those children.
          </p>
          <p>
            For styling needs. Classes can be individually applied with
            <KuiCode>className</KuiCode> (for the accordion entire),
            and <KuiCode>buttonClassName</KuiCode> (for the clickable area).
          </p>
        </div>
      }
      demo={<Accordion />}
    />
    <GuideSection
      title="Accordion can have extra actions"
      source={[{
        type: GuideSectionTypes.JS,
        code: accordionExtraSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: accordionExtraHtml,
      }]}
      text={
        <p>
          Use the <KuiCode>extraAction</KuiCode> prop to pass an extra action
          displayed on the right of any accordion. Usually this is a delete or
          button, but can be anything. Note that this action is separate from
          the click state that expands the accordion. This is needed to make
          it accessibile.
        </p>
     }
      demo={
        <AccordionExtra />
     }
    />
    <GuideSection
      title="Accordion for forms"
      source={[{
        type: GuideSectionTypes.JS,
        code: accordionFormSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: accordionFormHtml,
      }]}
      text={
        <p>
          Putting it all together. Using the <KuiCode>classNames</KuiCode>
          and <KuiCode>extraAction</KuiCode> as explained above, we can
          style the accordion in a way common for form use.
        </p>
     }
      demo={
        <AccordionForm />
     }
    />
  </GuidePage>
);
