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

import Accordian from './accordian';
const accordianSource = require('!!raw!./accordian');
const accordianHtml = renderToHtml(Accordian);

import AccordianForm from './accordian_form';
const accordianFormSource = require('!!raw!./accordian_form');
const accordianFormHtml = renderToHtml(AccordianForm);

import AccordianExtra from './accordian_extra';
const accordianExtraSource = require('!!raw!./accordian_extra');
const accordianExtraHtml = renderToHtml(AccordianExtra);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Accordian (unstyled)"
      source={[{
        type: GuideSectionTypes.JS,
        code: accordianSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: accordianHtml,
      }]}
      text={
        <div>
          <p>
            <KuiCode>KuiAccordian</KuiCode> is purposely bare so that you can
            put whatever styling you need on it (see the accordian form example). The only
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
            <KuiCode>className</KuiCode> (for the accordian entire),
            and <KuiCode>buttonClassName</KuiCode> (for the clickable area).
          </p>
        </div>
      }
      demo={<Accordian />}
    />
    <GuideSection
      title="Accordian can have extra actions"
      source={[{
        type: GuideSectionTypes.JS,
        code: accordianExtraSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: accordianExtraHtml,
      }]}
      text={
        <p>
          Use the <KuiCode>extraAction</KuiCode> prop to pass an extra action
          displayed on the right of any accordian. Usually this is a delete or
          button, but can be anything. Note that this action is separate from
          the click state that expands the accordian. This is needed to make
          it accessibile.
        </p>
     }
      demo={
        <AccordianExtra />
     }
    />
    <GuideSection
      title="Accordian for forms"
      source={[{
        type: GuideSectionTypes.JS,
        code: accordianFormSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: accordianFormHtml,
      }]}
      text={
        <p>
          Putting it all together. Using the <KuiCode>classNames</KuiCode>
          and <KuiCode>extraAction</KuiCode> as explained above, we can
          style the accordian in a way common for form use.
        </p>
     }
      demo={
        <AccordianForm />
     }
    />
  </GuidePage>
);
