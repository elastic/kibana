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

import BottomBar from './bottom_bar';
const bottomBarSource = require('!!raw!./bottom_bar');
const bottomBarHtml = renderToHtml(BottomBar);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="BottomBar"
      source={[{
        type: GuideSectionTypes.JS,
        code: bottomBarSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: bottomBarHtml,
      }]}
      text={
        <div>
          <p>
            <KuiCode>BottomBar</KuiCode> is a simple wrapper component that does
            nothing but fix a bottom bar (usually filled with buttons) to the bottom
            of the page.
          </p>
          <p>
            Use it when you have really long pages or complicated, multi-page
            forms. In the case of forms, only invoke it if a form is in a savable
            state.
          </p>
        </div>
      }
      demo={<BottomBar />}
    />
  </GuidePage>
);
