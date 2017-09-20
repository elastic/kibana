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
      text={
        <div>
          <p>
            <KuiCode>KuiToast</KuiCode> allows for small notes that appear in
            the bottom right of the screen. They should be used for emphemeral,
            live actions (think <strong>save complete</strong> or
            <strong>something just finished right now</strong>).
          </p>
          <p>They should not be used for historical actions
            (<strong>your report built 30 minutes ago</strong>).
            This means that a user should never be greated with toasts when
            starting a session. Toasts should be brief and avoid long paragraphs
            of text or titling.
          </p>
        </div>
      }
      demo={
        <div style={{ width: 320 }}>
          <Default />
        </div>
      }
    />

    <GuideSection
      title="Info"
      source={[{
        type: GuideSectionTypes.JS,
        code: infoSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: infoHtml,
      }]}
      text={
        <p>
          Setting <KuiCode>type=&quot;info&quot;</KuiCode>.
        </p>
      }
      demo={
        <div style={{ width: 320 }}>
          <Info />
        </div>
      }
    />

    <GuideSection
      title="Success"
      source={[{
        type: GuideSectionTypes.JS,
        code: successSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: successHtml,
      }]}
      text={
        <p>
          Setting <KuiCode>type=&quot;success&quot;</KuiCode>.
        </p>
      }
      demo={
        <div style={{ width: 320 }}>
          <Success />
        </div>
      }
    />

    <GuideSection
      title="Warning"
      source={[{
        type: GuideSectionTypes.JS,
        code: warningSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: warningHtml,
      }]}
      text={
        <p>
          Setting <KuiCode>type=&quot;warning&quot;</KuiCode>.
        </p>
      }
      demo={
        <div style={{ width: 320 }}>
          <Warning />
        </div>
      }
    />

    <GuideSection
      title="Danger"
      source={[{
        type: GuideSectionTypes.JS,
        code: dangerSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: dangerHtml,
      }]}
      text={
        <p>
          Setting <KuiCode>type=&quot;danger&quot;</KuiCode>.
        </p>
      }
      demo={
        <div style={{ width: 320 }}>
          <Danger />
        </div>
      }
    />
  </GuidePage>
);
