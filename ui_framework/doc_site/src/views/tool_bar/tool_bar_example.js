import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const toolBarHtml = require('./tool_bar.html');
const toolBarSearchOnlyHtml = require('./tool_bar_search_only.html');
const toolBarFooterHtml = require('./tool_bar_footer.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ToolBar"
      source={[{
        type: GuideSectionTypes.HTML,
        code: toolBarHtml,
      }]}
    >
      <GuideText>
        Use the ToolBar to surface controls for manipulating and filtering content, e.g. in a
        list, table, or menu.
      </GuideText>

      <GuideDemo
        html={toolBarHtml}
      />
    </GuideSection>

    <GuideSection
      title="ToolBar with Search only"
      source={[{
        type: GuideSectionTypes.HTML,
        code: toolBarSearchOnlyHtml,
      }]}
    >
      <GuideDemo
        html={toolBarSearchOnlyHtml}
      />
    </GuideSection>

    <GuideSection
      title="ToolBarFooter"
      source={[{
        type: GuideSectionTypes.HTML,
        code: toolBarFooterHtml,
      }]}
    >
      <GuideText>
        Use the ToolBarFooter in conjunction with the ToolBar. It can surface secondary
        controls or a subset of the primary controls.
      </GuideText>

      <GuideDemo
        html={toolBarFooterHtml}
      />
    </GuideSection>
  </GuidePage>
);
