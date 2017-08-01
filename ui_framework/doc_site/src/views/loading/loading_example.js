import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Loading from './loading';
const loadingSource = require('!!raw!./loading');
const loadingHtml = renderToHtml(Loading);

import LoadingChart from './loading_chart';
const loadingChartSource = require('!!raw!./loading_chart');
const loadingChartHtml = renderToHtml(LoadingChart);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Loading"
      source={[{
        type: GuideSectionTypes.JS,
        code: loadingSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: loadingHtml,
      }]}
    >
      <GuideText>
        Description needed: how to use the Loading component.
      </GuideText>

      <GuideDemo>
        <Loading />
      </GuideDemo>
    </GuideSection>
    <GuideSection
      title="Loading Chart"
      source={[{
        type: GuideSectionTypes.JS,
        code: loadingChartSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: loadingChartHtml,
      }]}
    >
      <GuideText>
        Description needed: how to use the Loading component.
      </GuideText>

      <GuideDemo>
        <LoadingChart />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
