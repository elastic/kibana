import React from 'react';

import {
  KuiPopover,
} from '../../../../components';

export default () => (
  <div>
    <KuiPopover
      button= {(
        <button>
          Popover anchored to the right.
        </button>
      )}
      isOpen={true}
      anchorPosition="right"
      closePopover={() => {}}
    >
      Popover content
    </KuiPopover>

    &nbsp;

    <KuiPopover
      button= {(
        <button>
          Popover anchored to the left.
        </button>
      )}
      isOpen={true}
      anchorPosition="left"
      closePopover={() => {}}
    >
      Popover content
    </KuiPopover>
  </div>
);
