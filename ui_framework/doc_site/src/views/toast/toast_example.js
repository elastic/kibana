import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import Default from './default';
const defaultSource = require('!!raw!./default');
const defaultHtml = renderToHtml(Default);

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
      title="Default"
      source={[{
        type: GuideSectionTypes.JS,
        code: defaultSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: defaultHtml,
      }]}
    >
      <GuideDemo>
        <Default />
      </GuideDemo>
    </GuideSection>

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
      <GuideDemo>
        <Danger />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
