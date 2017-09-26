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

import AdvancedSettings from './advanced_settings';
const advancedSettingsSource = require('!!raw!./advanced_settings');
const advancedSettingsHtml = renderToHtml(AdvancedSettings);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="AdvancedSettings"
      source={[{
        type: GuideSectionTypes.JS,
        code: advancedSettingsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: advancedSettingsHtml,
      }]}
      text={
        <p>
          Description needed: how to use the <KuiCode>AdvancedSettings</KuiCode> component.
        </p>
      }
      demo={<AdvancedSettings />}
    />
  </GuidePage>
);
