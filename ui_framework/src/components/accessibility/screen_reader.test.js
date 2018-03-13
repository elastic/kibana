import React from 'react';
import { render } from 'enzyme';

import { KuiScreenReaderOnly } from './screen_reader';

describe('KuiScreenReaderOnly', () => {
  describe('adds an accessibility class to a child element', () => {
    test('when used with no props', () => {
      const $paragraph = render(
        <KuiScreenReaderOnly>
          <p>
            This paragraph is not visibile to sighted users but will be read by
            screenreaders.
          </p>
        </KuiScreenReaderOnly>
      );

      expect($paragraph)
        .toMatchSnapshot();
    });
    test('and combines other classNames (foo, bar) given as props on the child', () => {
      const $paragraph = render(
        <KuiScreenReaderOnly>
          <p className="foo bar">
            This paragraph is not visibile to sighted users but will be read by
            screenreaders.
          </p>
        </KuiScreenReaderOnly>
      );

      expect($paragraph)
        .toMatchSnapshot();
    });
  });
});
