import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideText,
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
        <GuideText>
          <p>
            Toasts are small notes that appear in the bottom right of the screen. They should be used for
            emphemeral, live actions (think "save complete" or "something just finished right now"). They
            should not be used for historical actions ("your report built 30 minutes ago"). This means that
            a user should never be greated with toasts when starting a session. Toasts should be brief and
            avoid long paragraphs of text or titling.
          </p>
          <br/>
        </GuideText>
        <div style={{ width: 320 }}>
          <Default />
        </div>
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
        <div style={{ width: 320 }}>
          <Info />
        </div>
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
        <div style={{ width: 320 }}>
          <Success />
        </div>
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
        <div style={{ width: 320 }}>
          <Warning />
        </div>
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
        <div style={{ width: 320 }}>
          <Danger />
        </div>
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
