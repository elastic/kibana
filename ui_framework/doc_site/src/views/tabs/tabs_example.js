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

import Tabs from './tabs';
const tabsSource = require('!!raw!./tabs');
const tabsHtml = renderToHtml(Tabs);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Tabs"
      source={[{
        type: GuideSectionTypes.JS,
        code: tabsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: tabsHtml,
      }]}
      text={
        <p>
          The <KuiCode>KuiTabs</KuiCode> component should have <KuiCode>KuiTab</KuiCode>
          components as children.
        </p>
      }
      demo={
        <Tabs />
      }
    />
  </GuidePage>
);
