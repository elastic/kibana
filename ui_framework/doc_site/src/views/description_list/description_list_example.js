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
          Description needed: how to use the <KuiCode>DescriptionList</KuiCode> component.
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
          Description needed: how to use the <KuiCode>DescriptionList</KuiCode> component.
        </p>
      }
      demo={<DescriptionListColumn />}
    />
  </GuidePage>
);
