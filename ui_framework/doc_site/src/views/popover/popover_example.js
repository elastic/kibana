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

import Popover from './popover';
const popoverSource = require('!!raw!./popover');
const popoverHtml = renderToHtml(Popover);

import PopoverAnchorPosition from './popover_anchor_position';
const popoverAnchorPositionSource = require('!!raw!./popover_anchor_position');
const popoverAnchorPositionHtml = renderToHtml(PopoverAnchorPosition);

import PopoverPanelClassName from './popover_panel_class_name';
const popoverPanelClassNameSource = require('!!raw!./popover_panel_class_name');
const popoverPanelClassNameHtml = renderToHtml(PopoverPanelClassName);

import PopoverWithTitle from './popover_with_title';
const popoverWithTitleSource = require('!!raw!./popover_with_title');
const popoverWithTitleHtml = renderToHtml(PopoverWithTitle);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Popover"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverHtml,
      }]}
      text={
        <p>
          Use the Popover component to hide controls or options behind a clickable element.
        </p>
      }
      demo={
        <Popover />
      }
    />

    <GuideSection
      title="Anchor position"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverAnchorPositionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverAnchorPositionHtml,
      }]}
      text={
        <div>
          <p>
            The alignment and arrow on your popover can be set with
            the <KuiCode>anchorPostion</KuiCode> prop. These positions will not
            update based upon screen real estate and will stick to the positions
            you declare. Because of this,
            <strong>be careful when using left or right positioning</strong>.
          </p>
          <p><strong>Some tips:</strong></p>
          <ul>
            <li>
              The first word in the <KuiCode>anchorPosition</KuiCode> denotes
              where the popover will appear relative to the button.
            </li>
            <li>
              The second word in the <KuiCode>anchorPosition</KuiCode> denotes
              where the gravity / pin position will appear relative to the popover.
            </li>
          </ul>
        </div>
      }
      demo={
        <PopoverAnchorPosition />
      }
    />

    <GuideSection
      title="Popover with title"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverWithTitleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverWithTitleHtml,
      }]}
      text={
        <div>
          <p>
            Popovers often have need for titling. This can be applied through
            a prop or used separately as its own component
            <KuiCode>KuiPopoverTitle</KuiCode> nested somwhere in the child
            prop.
          </p>
          <p>
            Note that when using popover titles, you will need to
            set <KuiCode>panelPaddingSize=&quot;none&quot;</KuiCode> and apply
            some sort of padding around your content block itself.
          </p>
        </div>
      }
      demo={
        <PopoverWithTitle />
      }
    />

    <GuideSection
      title="Panel class name and padding size"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverPanelClassNameSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverPanelClassNameHtml,
      }]}
      text={
        <p>
          Use the <KuiCode>panelPaddingSize</KuiCode> prop to adjust the padding
          on the panel within the panel. Use the <KuiCode>panelClassName</KuiCode> prop
          to pass a custom class to the panel. inside a popover.
        </p>
      }
      demo={
        <PopoverPanelClassName />
      }
    />
  </GuidePage>
);
