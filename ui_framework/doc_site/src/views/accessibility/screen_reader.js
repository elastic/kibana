import React from 'react';

export default () => (
  <div>
    <p>
      This is the first paragraph. It is visible to all.
    </p>
    <p className='kuiScreenReaderOnly'>
      This is the second paragraph. It is hidden for sighted users but visible to screen readers.
    </p>
    <p>
      This is the third paragraph. It is visible to all.
    </p>
  </div>
);

