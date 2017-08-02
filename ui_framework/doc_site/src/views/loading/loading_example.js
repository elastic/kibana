import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import LoadingKibana from './loading_kibana';
const loadingKibanaSource = require('!!raw!./loading_kibana');
const loadingKibanaHtml = renderToHtml(LoadingKibana);

import LoadingChart from './loading_chart';
const loadingChartSource = require('!!raw!./loading_chart');
const loadingChartHtml = renderToHtml(LoadingChart);

import LoadingSpinner from './loading_spinner';
const loadingSpinnerSource = require('!!raw!./loading_spinner');
const loadingSpinnerHtml = renderToHtml(LoadingSpinner);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Loading Kibana"
      source={[{
        type: GuideSectionTypes.JS,
        code: loadingKibanaSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: loadingKibanaHtml,
      }]}
    >
      <GuideText>
        Logo based load. Should only be used in very large panels, like bootup screens.
      </GuideText>

      <GuideDemo>
        <LoadingKibana />
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
        Loader for the loading of chart or dashboard and visualization elements.
        The colored versions should be used sparingly, only when a single large
        visualization is loaded. When loading smaller groups of panels, the smaller,
        mono versions should be used.
      </GuideText>

      <GuideDemo>
        <LoadingChart />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Loading Spinner"
      source={[{
        type: GuideSectionTypes.JS,
        code: loadingSpinnerSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: loadingSpinnerHtml,
      }]}
    >
      <GuideText>
        A simple spinner for most loading applications.
      </GuideText>

      <GuideDemo>
        <LoadingSpinner />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
