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

import { ConfirmModalExample } from './confirm_modal_example';
const showConfirmModalSource = require('!!raw!./confirm_modal_example');
const showConfirmModalHtml = renderToHtml(ConfirmModalExample);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Pop up Confirmation Modal with Overlay"
      source={[{
        type: GuideSectionTypes.JS,
        code: showConfirmModalSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: showConfirmModalHtml,
      }]}
      text={
        <p>
          A fixed <KuiCode>KuiConfirmModal</KuiCode> loaded with a mask through
          click events.
        </p>
      }
      demo={
        <ConfirmModalExample />
      }
    />
  </GuidePage>
);
