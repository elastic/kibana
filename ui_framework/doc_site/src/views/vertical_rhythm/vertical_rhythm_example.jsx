import React from 'react';

import {
  createExample,
} from '../../services';

export default createExample([{
  title: 'VerticalRhythm',
  description: (
    <div>
      <p>VerticalRhythm creates regular vertical spacing between elements.</p>
      <p><strong>Note:</strong> It only works if two adjacent elements have this class applied, in which case it will create space between them.</p>
    </div>
  ),
  html: require('./vertical_rhythm.html'),
  hasDarkTheme: false,
}, {
  title: 'VerticalRhythm with Panels',
  description: (
    <p>You can apply it to any component, e.g. Panels.</p>
  ),
  html: require('./vertical_rhythm_with_panels.html'),
  hasDarkTheme: false,
}]);
