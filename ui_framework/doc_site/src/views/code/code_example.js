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
          Description needed: how to use the <KuiCode>Code</KuiCode> component.
        </p>
      }
      demo={
        <Code />
      }
    />
  </GuidePage>
);
