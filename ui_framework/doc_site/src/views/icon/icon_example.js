import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import IconSearch from './icon_search';
const iconSearchSource = require('!!raw!./icon_search');
const iconSearchHtml = renderToHtml(IconSearch);

import IconUser from './icon_user';
const iconUserSource = require('!!raw!./icon_user');
const iconUserHtml = renderToHtml(IconUser);

import IconSizes from './icon_sizes';
const iconSizesSource = require('!!raw!./icon_sizes');
const iconSizesHtml = renderToHtml(IconSizes);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Search"
      source={[{
        type: GuideSectionTypes.JS,
        code: iconSearchSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: iconSearchHtml,
      }]}
    >
      <GuideDemo>
        <IconSearch />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="User"
      source={[{
        type: GuideSectionTypes.JS,
        code: iconUserSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: iconUserHtml,
      }]}
    >
      <GuideDemo>
        <IconUser />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Icon sizes"
      source={[{
        type: GuideSectionTypes.JS,
        code: iconSizesSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: iconSizesHtml,
      }]}
    >
      <GuideDemo>
        <IconSizes />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
