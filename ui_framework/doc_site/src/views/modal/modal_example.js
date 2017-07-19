import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiConfirmModal,
} from '../../../../components';

import { ConfirmModalExample } from './confirm_modal_example';
const showConfirmModalSource = require('!!raw!./confirm_modal_example');
const showConfirmModalHtml = renderToHtml(ConfirmModalExample);

const kuiConfirmModalSource = require('!!raw!../../../../components/modal/confirm_modal');
const kuiConfirmModalHtml = renderToHtml(KuiConfirmModal);

export default props => (
  <GuidePage title={props.route.name}>

    <GuideSection
      title="Confirmation Modal"
      source={[{
        type: GuideSectionTypes.JS,
        code: kuiConfirmModalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: kuiConfirmModalHtml,
      }]}
    >
      <GuideDemo>
          <KuiConfirmModal
            onCancel={() => {}}
            onConfirm={() => {}}
            confirmButtonText="Confirm"
            cancelButtonText="Cancel"
            message="This is a confirmation modal"
            title="Confirm Modal Title"
          />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Pop up Confirmation Modal with Overlay"
      source={[{
        type: GuideSectionTypes.JS,
        code: showConfirmModalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: showConfirmModalHtml,
      }]}
    >
      <GuideDemo>
        <ConfirmModalExample />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
