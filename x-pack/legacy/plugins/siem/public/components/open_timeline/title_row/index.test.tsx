/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { EuiButtonProps } from '@elastic/eui';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import * as React from 'react';
import { ThemeProvider } from 'styled-components';

import { TitleRow } from '.';

describe('TitleRow', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  const title = 'All Timelines / Open Timelines';

  test('it renders the title', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TitleRow
          onAddTimelinesToFavorites={jest.fn()}
          onDeleteSelected={jest.fn()}
          selectedTimelinesCount={0}
          title={title}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-section-title"]')
        .first()
        .text()
    ).toEqual(title);
  });

  describe('Favorite Selected button', () => {
    test('it renders the Favorite Selected button when onAddTimelinesToFavorites is provided', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <TitleRow
            onAddTimelinesToFavorites={jest.fn()}
            onDeleteSelected={jest.fn()}
            selectedTimelinesCount={0}
            title={title}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="favorite-selected"]')
          .first()
          .exists()
      ).toBe(true);
    });

    test('it does NOT render the Favorite Selected button when onAddTimelinesToFavorites is NOT provided', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <TitleRow onDeleteSelected={jest.fn()} selectedTimelinesCount={0} title={title} />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="favorite-selected"]')
          .first()
          .exists()
      ).toBe(false);
    });

    test('it disables the Favorite Selected button when the selectedTimelinesCount is 0', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <TitleRow
            onAddTimelinesToFavorites={jest.fn()}
            onDeleteSelected={jest.fn()}
            selectedTimelinesCount={0}
            title={title}
          />
        </ThemeProvider>
      );

      const props = wrapper
        .find('[data-test-subj="favorite-selected"]')
        .first()
        .props() as EuiButtonProps;

      expect(props.isDisabled).toBe(true);
    });

    test('it enables the Favorite Selected button when the selectedTimelinesCount is greater than 0', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <TitleRow
            onAddTimelinesToFavorites={jest.fn()}
            onDeleteSelected={jest.fn()}
            selectedTimelinesCount={3}
            title={title}
          />
        </ThemeProvider>
      );

      const props = wrapper
        .find('[data-test-subj="favorite-selected"]')
        .first()
        .props() as EuiButtonProps;

      expect(props.isDisabled).toBe(false);
    });

    test('it invokes onAddTimelinesToFavorites when the Favorite Selected button is clicked', () => {
      const onAddTimelinesToFavorites = jest.fn();

      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <TitleRow
            onAddTimelinesToFavorites={onAddTimelinesToFavorites}
            onDeleteSelected={jest.fn()}
            selectedTimelinesCount={3}
            title={title}
          />
        </ThemeProvider>
      );

      wrapper
        .find('[data-test-subj="favorite-selected"]')
        .first()
        .simulate('click');

      expect(onAddTimelinesToFavorites).toHaveBeenCalled();
    });
  });

  describe('Delete Selected button', () => {
    test('it renders the Delete Selected button when onDeleteSelected is provided', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <TitleRow
            onAddTimelinesToFavorites={jest.fn()}
            onDeleteSelected={jest.fn()}
            selectedTimelinesCount={0}
            title={title}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="delete-selected"]')
          .first()
          .exists()
      ).toBe(true);
    });

    test('it does NOT render the Delete Selected button when onDeleteSelected is NOT provided', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <TitleRow
            onAddTimelinesToFavorites={jest.fn()}
            selectedTimelinesCount={0}
            title={title}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="delete-selected"]')
          .first()
          .exists()
      ).toBe(false);
    });

    test('it disables the Delete Selected button when the selectedTimelinesCount is 0', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <TitleRow
            onAddTimelinesToFavorites={jest.fn()}
            onDeleteSelected={jest.fn()}
            selectedTimelinesCount={0}
            title={title}
          />
        </ThemeProvider>
      );

      const props = wrapper
        .find('[data-test-subj="delete-selected"]')
        .first()
        .props() as EuiButtonProps;

      expect(props.isDisabled).toBe(true);
    });

    test('it enables the Delete Selected button when the selectedTimelinesCount is greater than 0', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <TitleRow
            onAddTimelinesToFavorites={jest.fn()}
            onDeleteSelected={jest.fn()}
            selectedTimelinesCount={1}
            title={title}
          />
        </ThemeProvider>
      );

      const props = wrapper
        .find('[data-test-subj="delete-selected"]')
        .first()
        .props() as EuiButtonProps;

      expect(props.isDisabled).toBe(false);
    });

    test('it invokes onDeleteSelected when the Delete Selected button is clicked', () => {
      const onDeleteSelected = jest.fn();

      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <TitleRow
            onAddTimelinesToFavorites={jest.fn()}
            onDeleteSelected={onDeleteSelected}
            selectedTimelinesCount={1}
            title={title}
          />
        </ThemeProvider>
      );

      wrapper
        .find('[data-test-subj="delete-selected"]')
        .first()
        .simulate('click');

      expect(onDeleteSelected).toHaveBeenCalled();
    });
  });
});
