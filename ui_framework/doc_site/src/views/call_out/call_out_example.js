import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Info from './info';
const infoSource = require('!!raw!./info');
const infoHtml = renderToHtml(Info);

import Success from './success';
const successSource = require('!!raw!./success');
const successHtml = renderToHtml(Success);

import Warning from './warning';
const warningSource = require('!!raw!./warning');
const warningHtml = renderToHtml(Warning);

import Danger from './danger';
const dangerSource = require('!!raw!./danger');
const dangerHtml = renderToHtml(Danger);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Info"
      source={[{
        type: GuideSectionTypes.JS,
        code: infoSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: infoHtml,
      }]}
    >
      <GuideText>
        Use this CallOut to communicate general information to the user.
      </GuideText>

      <GuideDemo>
        <Info />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Success"
      source={[{
        type: GuideSectionTypes.JS,
        code: successSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: successHtml,
      }]}
    >
      <GuideText>
        Use this CallOut to notify the user of a succesfully completed action.
      </GuideText>

      <GuideDemo>
        <Success />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Warning"
      source={[{
        type: GuideSectionTypes.JS,
        code: warningSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: warningHtml,
      }]}
    >
      <GuideText>
        Use this CallOut to warn the user against decisions they might regret.
      </GuideText>

      <GuideDemo>
        <Warning />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Danger"
      source={[{
        type: GuideSectionTypes.JS,
        code: dangerSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: dangerHtml,
      }]}
    >
      <GuideText>
        Use this CallOut to let the user know something went wrong.
      </GuideText>

      <GuideDemo>
        <Danger />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
