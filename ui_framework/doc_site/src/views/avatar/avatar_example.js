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

import Avatar from './avatar';
const avatarSource = require('!!raw!./avatar');
const avatarHtml = renderToHtml(Avatar);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Avatar"
      source={[{
        type: GuideSectionTypes.JS,
        code: avatarSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: avatarHtml,
      }]}
      text={
        <p>
          The <KuiCode>Avatar</KuiCode> component creates a user icon. It will
          accept <KuiCode>name</KuiCode> (requred) and <KuiCode>image</KuiCode> props
          and will configure the display and accessibility as needed.
        </p>
      }
      demo={<Avatar />}
    />
  </GuidePage>
);
