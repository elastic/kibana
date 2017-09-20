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

import DescriptionList from './description_list';
const descriptionListSource = require('!!raw!./description_list');
const descriptionListHtml = renderToHtml(DescriptionList);

import DescriptionListColumn from './description_list_column';
const descriptionListColumnSource = require('!!raw!./description_list_column');
const descriptionListColumnHtml = renderToHtml(DescriptionListColumn);

import DescriptionListStyling from './description_list_styling';
const descriptionListStylingSource = require('!!raw!./description_list_styling');
const descriptionListStylingHtml = renderToHtml(DescriptionListStyling);

import DescriptionListInline from './description_list_inline';
const descriptionListInlineSource = require('!!raw!./description_list_inline');
const descriptionListInlineHtml = renderToHtml(DescriptionListInline);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="DescriptionList"
      source={[{
        type: GuideSectionTypes.JS,
        code: descriptionListSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: descriptionListHtml,
      }]}
      text={
        <p>
          <KuiCode>DescriptionList</KuiCode> is a component for listing pairs of
          information together. You can use the component on its own, passing
          in an object for the list, or use
          the <KuiCode>KuiDescriptionListTitle</KuiCode> and <KuiCode>KuiDescriptionListDescription</KuiCode>
          components separately to build a list manually.
        </p>
      }
      demo={<DescriptionList />}
    />
    <GuideSection
      title="Description list as columns"
      source={[{
        type: GuideSectionTypes.JS,
        code: descriptionListColumnSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: descriptionListColumnHtml,
      }]}
      text={
        <p>
          Using a prop <KuiCode>type</KuiCode> set to <KuiCode>column</KuiCode> description lists
          can be presented in an inline, column format.
        </p>
      }
      demo={<DescriptionListColumn />}
    />
    <GuideSection
      title="Description lists can be inline"
      source={[{
        type: GuideSectionTypes.JS,
        code: descriptionListInlineSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: descriptionListInlineHtml,
      }]}
      text={
        <p>
          Using a prop <KuiCode>type</KuiCode> set to <KuiCode>inline</KuiCode> description lists
          can be presented in an inline, blob format. This is useful for JSON code blocks. Inline
          description lists are sized smaller then normal lists due to their compact nature.
        </p>
     }
      demo={
        <DescriptionListInline />
     }
    />
    <GuideSection
      title="Description lists can be centered and compressed"
      source={[{
        type: GuideSectionTypes.JS,
        code: descriptionListStylingSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: descriptionListStylingHtml,
      }]}
      text={
        <p>
          Using the <KuiCode>align</KuiCode> and <KuiCode>compressed</KuiCode> props you
          can further tailor the look of a description list. This works with column
          and inline types.
        </p>
     }
      demo={
        <DescriptionListStyling />
     }
    />
  </GuidePage>
);
