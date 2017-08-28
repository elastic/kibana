import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCode,
  KuiLink,
} from '../../../../components';


import KeyboardAccessible from './keyboard_accessible';
import ScreenReaderOnly from './screen_reader';

const keyboardAccessibleSource = require('!!raw!./keyboard_accessible');
const keyboardAccessibleHtml = renderToHtml(KeyboardAccessible);

const screenReaderOnlyHtml = renderToHtml(ScreenReaderOnly);
const screenReaderOnlySource = require('!!raw!./screen_reader');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="KeyboardAccessible"
      source={[{
        type: GuideSectionTypes.JS,
        code: keyboardAccessibleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: keyboardAccessibleHtml,
      }]}
      text={
        <p>
          You can make interactive elements keyboard-accessible with this component. This is necessary
          for non-button elements and <KuiCode>a</KuiCode> tags without
          <KuiCode>href</KuiCode> attributes.
        </p>
      }
      demo={
        <KeyboardAccessible />
      }
    />

    <GuideSection
      title="ScreenReaderOnly"
      source={[{
        type: GuideSectionTypes.JS,
        code: screenReaderOnlySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: screenReaderOnlyHtml,
      }]}
      text={
        <div>
          <p>
            This class can be useful to add accessibility to older designs that are
            still in use, but it shouldn&rsquo;t be a permanent solution. See {(
              <KuiLink
                href="http://webaim.org/techniques/css/invisiblecontent/"
              >
                http://webaim.org/techniques/css/invisiblecontent/
              </KuiLink>
            )} for more information.
          </p>
          <p>
            Use a screenreader to verify that there is a second paragraph in this example:
          </p>
        </div>
      }
      demo={
        <ScreenReaderOnly />
      }
    />
  </GuidePage>
);
