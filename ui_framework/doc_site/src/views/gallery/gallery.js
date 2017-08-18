import React from 'react';

import {
  KuiGallery,
  KuiGalleryButton,
  KuiGalleryButtonIcon,
  KuiGalleryButtonImage,
  KuiGalleryButtonLabel
} from '../../../../components';

export default () => {
  /**
  * These styles are just for demonstration purposes. It is recommended to use
  * properly named classes instead of CSS properties in production code.
  */
  const imageStyle = {
    backgroundColor: 'lightgray'
  };

  return (
    <div>
      <div className="kuiVerticalRhythm">
        <h2 className="kuiSubTitle kuiVerticalRhythmSmall">
          Some items
        </h2>

        <KuiGallery className="kuiVerticalRhythmSmall">
          <KuiGalleryButton href="#">
            <KuiGalleryButtonImage style={imageStyle}/>

            <KuiGalleryButtonLabel>
              Item A
            </KuiGalleryButtonLabel>

            <KuiGalleryButtonIcon className="fa-flask"/>
          </KuiGalleryButton>

          <KuiGalleryButton href="#">
            <KuiGalleryButtonImage style={imageStyle}/>

            <KuiGalleryButtonLabel>
              Item B
            </KuiGalleryButtonLabel>
          </KuiGalleryButton>

          <KuiGalleryButton>
            <KuiGalleryButtonImage style={imageStyle}/>

            <KuiGalleryButtonLabel>
              Item C
            </KuiGalleryButtonLabel>
          </KuiGalleryButton>

          <KuiGalleryButton>
            <KuiGalleryButtonImage style={imageStyle}/>

            <KuiGalleryButtonLabel>
              Item D
            </KuiGalleryButtonLabel>
          </KuiGalleryButton>

          <KuiGalleryButton>
            <KuiGalleryButtonImage style={imageStyle}/>

            <KuiGalleryButtonLabel>
              Item E
            </KuiGalleryButtonLabel>
          </KuiGalleryButton>
        </KuiGallery>
      </div>

      <div className="kuiVerticalRhythm">
        <div className="kuiSubTitle kuiVerticalRhythmSmall">
          Some more items
        </div>

        <KuiGallery className="kuiVerticalRhythmSmall">
          <KuiGalleryButton href="#">
            <KuiGalleryButtonImage style={imageStyle}/>

            <KuiGalleryButtonLabel>
              Item F
            </KuiGalleryButtonLabel>
          </KuiGalleryButton>

          <KuiGalleryButton href="#">
            <KuiGalleryButtonImage style={imageStyle}/>

            <KuiGalleryButtonLabel>
              Item G with a long label with ellipsis
            </KuiGalleryButtonLabel>
          </KuiGalleryButton>
        </KuiGallery>
      </div>
    </div>
  );
};
