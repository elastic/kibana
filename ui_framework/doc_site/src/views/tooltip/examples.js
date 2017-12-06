import React from 'react';

import {
  KuiTooltipTrigger,
} from '../../../../components';

const autoPlacementTooltip = `I should be on the top but may get placed in another location
if I overflow the browser window. This will come in handy when tooltips get placed near the top
of pages. Its very hard to read a tooltip when part of it gets cut off and if you can't read it
then what is the point?`;

export default () => (
  <div>
    <div>
      Check out this {(
        <KuiTooltipTrigger tooltip="I am the body" title="I am the title">
          <span className="overlay-trigger" tabIndex="0"> tooltip with title.</span>
        </KuiTooltipTrigger>
      )}
    </div>
    <div>
      Check out this {(
        <KuiTooltipTrigger tooltip={autoPlacementTooltip} placement="top" size="m">
          <span className="overlay-trigger" tabIndex="0"> tooltip on the top.</span>
        </KuiTooltipTrigger>
      )}
    </div>
    <div>
      Check out this {(
        <KuiTooltipTrigger tooltip={autoPlacementTooltip} placement="top" size="m" trigger="click">
          <span className="overlay-trigger" tabIndex="0"> tooltip on click.</span>
        </KuiTooltipTrigger>
      )}
    </div>
    <div>
      Check out this {(
        <KuiTooltipTrigger tooltip="I should be on the left" placement="left">
          <span className="overlay-trigger" tabIndex="0"> tooltip on the left.</span>
        </KuiTooltipTrigger>
      )}
    </div>

    <div>
      Check out this {(
        <KuiTooltipTrigger tooltip="I should be on the right" placement="right">
          <span className="overlay-trigger" tabIndex="0"> tooltip on the right.</span>
        </KuiTooltipTrigger>
      )}
    </div>

    <div>
      Check out this {(
        <KuiTooltipTrigger tooltip="I should be on the bottom" placement="bottom">
          <span className="overlay-trigger" tabIndex="0"> tooltip on the bottom.</span>
        </KuiTooltipTrigger>
      )}
    </div>
  </div>
);
