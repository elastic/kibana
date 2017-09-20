import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import Header from './header';
const headerSource = require('!!raw!./header');
const headerHtml = renderToHtml(Header);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Header"
      source={[{
        type: GuideSectionTypes.JS,
        code: headerSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: headerHtml,
      }]}
      text={
        <p>
          The header is made up of several individual components.
        </p>
      }
      demo={
        <Header />
      }
    />
  </GuidePage>
);
