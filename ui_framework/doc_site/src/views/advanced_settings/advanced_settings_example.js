import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

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
          This is a pretty dirty example of how to handle a menu system with
          nesting within it. Right now it includes a lot of the same code
          from the Kibana demo, but we should abstract this stuff into more
          portable wrappers.
        </p>
      }
      demo={<AdvancedSettings />}
    />
  </GuidePage>
);
