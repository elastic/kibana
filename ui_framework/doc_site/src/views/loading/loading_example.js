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

import LoadingMessage from './loading_message';
const loadingMessageSource = require('!!raw!./loading_message');
const loadingMessageHtml = renderToHtml(LoadingMessage);

import LoadingSpinner from './loading_spinner';
const loadingSpinnerSource = require('!!raw!./loading_spinner');
const loadingSpinnerHtml = renderToHtml(LoadingSpinner);

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
        Logo based load. Should only be used in very large panels, like bootup screens.
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

    <GuideSection
      title="Loading with Message"
      source={[{
        type: GuideSectionTypes.JS,
        code: loadingMessageSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: loadingMessageHtml,
      }]}
    >
      <GuideText>
        Present any loader with a message.
      </GuideText>

      <GuideDemo>
        <LoadingMessage />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
