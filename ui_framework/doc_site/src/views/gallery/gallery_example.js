import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText
} from '../../components';

import Gallery from './gallery';
const gallerySource = require('!!raw!./gallery');
const galleryHtml = renderToHtml(Gallery);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Gallery"
      source={[{
        type: GuideSectionTypes.JS,
        code: gallerySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: galleryHtml,
      }]}
    >
      <GuideText>
        Use GalleryButton to show a gallery item.
        It&rsquo;s an anchor and accepts all anchor properties.
      </GuideText>

      <GuideDemo>
        <Gallery />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
