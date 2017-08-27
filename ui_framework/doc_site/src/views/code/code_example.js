import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import Code from './code';
const codeSource = require('!!raw!./code');
const codeHtml = renderToHtml(Code);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Code"
      source={[{
        type: GuideSectionTypes.JS,
        code: codeSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: codeHtml,
      }]}
      text={
        <p>
          Description needed: how to use the <GuideCode>Code</GuideCode> component.
        </p>
      }
      demo={
        <Code />
      }
    />
  </GuidePage>
);
