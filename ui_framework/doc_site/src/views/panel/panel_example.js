import React from 'react';

import { Link } from 'react-router';

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
      text={
        <p>
          <KuiCode>Panel</KuiCode> is a simple wrapper component to add
          depth to a contained layout. It it commonly used as a base for
          other larger components like <Link to="/page">Page</Link> and <Link to="/popover">Popover</Link>.
        </p>
      }
      demo={<Panel />}
    />
  </GuidePage>
);
