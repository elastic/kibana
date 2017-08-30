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

import Panel from './panel';
const panelSource = require('!!raw!./panel');
const panelHtml = renderToHtml(Panel);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Panel"
      source={[{
        type: GuideSectionTypes.JS,
        code: panelSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: panelHtml,
      }]}
      type={
        <p>
          Description needed: how to use the <KuiCode>Panel</KuiCode> component.
        </p>
      }
      demo={<Panel />}
    />
  </GuidePage>
);
