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

import { ModalExample } from './modal';
const modalSource = require('!!raw!./modal');
const modalHtml = renderToHtml(ModalExample);

import { ConfirmModalExample } from './confirm_modal';
const confirmModalSource = require('!!raw!./confirm_modal');
const confirmModalHtml = renderToHtml(ConfirmModalExample);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Modal"
      source={[{
        type: GuideSectionTypes.JS,
        code: modalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: modalHtml,
      }]}
      text={
        <p>
          Use a <KuiCode>KuiModal</KuiCode> to temporarily escape the current UX and create a
          another UX within it.
        </p>
      }
      demo={
        <ModalExample />
      }
    />

    <GuideSection
      title="Confirm Modal"
      source={[{
        type: GuideSectionTypes.JS,
        code: confirmModalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: confirmModalHtml,
      }]}
      text={
        <p>
          Use the <KuiCode>KuiConfirmModal</KuiCode> to ask the user to confirm a decision,
          typically one which is destructive and potentially regrettable.
        </p>
      }
      demo={
        <ConfirmModalExample />
      }
    />
  </GuidePage>
);
