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
  title: 'VerticalRhythm as wrapper',
  description: (
    <p>Wrap any series of components, e.g. Panel, in the VerticalRhythm component to space them apart.</p>
  ),
  html: require('./vertical_rhythm_as_wrapper.html'),
  hasDarkTheme: false,
}, {
  title: 'VerticalRhythm on component',
  description: (
    <p>You can also apply the VerticalRhythm class directly to components.</p>
  ),
  html: require('./vertical_rhythm_on_component.html'),
  hasDarkTheme: false,
}]);
