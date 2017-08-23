import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuideSandbox,
  GuideSandboxCodeToggle,
  GuideSectionTypes,
} from '../../components';

import FormGallery from './form_gallery';
const formGallerySource = require('!!raw!./form_gallery');
const formGalleryHtml = renderToHtml(FormGallery);

export default props => (
  <GuideSandbox>
    <GuideDemo isFullScreen={true}>
      <FormGallery />
    </GuideDemo>

    <GuideSandboxCodeToggle
      title={props.route.name}
      source={[{
        type: GuideSectionTypes.JS,
        code: formGallerySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formGalleryHtml,
      }]}
    />
  </GuideSandbox>
);
