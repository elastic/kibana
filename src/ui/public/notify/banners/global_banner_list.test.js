import React from 'react';
import { render } from 'enzyme';
import { GlobalBannerList } from './global_banner_list';

describe('GlobalBannerList', () => {

  test('is rendered', () => {
    const component = render(
      <GlobalBannerList />
    );

    expect(component)
      .toMatchSnapshot();

  });

  describe('props', () => {

    describe('banners', () => {

      test('is rendered', () => {
        const banners = [{
          id: 'a',
          component: 'a component',
          priority: 1,
        }, {
          'data-test-subj': 'b',
          id: 'b',
          component: 'b good',
        }];

        const component = render(
          <GlobalBannerList
            banners={banners}
          />
        );

        expect(component)
          .toMatchSnapshot();
      });

    });

  });

});
