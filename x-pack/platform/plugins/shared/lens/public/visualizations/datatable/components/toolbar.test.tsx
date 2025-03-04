/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getSelectedButtonInGroup } from '@kbn/test-eui-helpers';
import { DataTableToolbar } from './toolbar';
import { DatatableVisualizationState } from '../visualization';
import { FramePublicAPI, VisualizationToolbarProps } from '../../../types';
import { PagingState } from '../../../../common/expressions';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// mocking random id generator function
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: (fn: unknown) => {
      return () => '';
    },
  };
});

describe('datatable toolbar', () => {
  const defaultPagingState: PagingState = {
    size: 10,
    enabled: true,
  };

  let defaultProps: VisualizationToolbarProps<DatatableVisualizationState>;

  beforeEach(() => {
    defaultProps = {
      setState: jest.fn(),
      frame: {} as FramePublicAPI,
      state: {} as DatatableVisualizationState,
    };
  });

  const renderAndOpenToolbar = async (overrides = {}) => {
    const ROW_HEIGHT_SETTINGS_TEST_ID = 'lnsRowHeightSettings';
    const HEADER_HEIGHT_SETTINGS_TEST_ID = 'lnsHeaderHeightSettings';

    const rtlRender = render(<DataTableToolbar {...defaultProps} {...overrides} />);

    const togglePopover = async () => {
      await userEvent.click(screen.getByRole('button', { name: /visual options/i }));
    };
    await togglePopover();

    const selectOptionFromButtonGroup = (testId: string) => (optionName: string | RegExp) => {
      const buttonGroup = screen.getByTestId(testId);
      const option = within(buttonGroup).getByRole('button', { name: optionName });
      fireEvent.click(option);
    };

    const getNumberInput = (testId: string) =>
      within(screen.getByTestId(testId)).queryByRole('spinbutton');

    const getPaginationSwitch = () => screen.getByTestId('lens-table-pagination-switch'); // TODO: use getByLabel when EUI fixes the generated-id issue
    const clickPaginationSwitch = () => {
      fireEvent.click(getPaginationSwitch());
    };

    return {
      ...rtlRender,
      togglePopover,
      getRowHeightValue: getSelectedButtonInGroup(ROW_HEIGHT_SETTINGS_TEST_ID),
      getRowHeightCustomValue: () => getNumberInput(ROW_HEIGHT_SETTINGS_TEST_ID),
      selectRowHeightOption: selectOptionFromButtonGroup(ROW_HEIGHT_SETTINGS_TEST_ID),
      getHeaderHeightValue: getSelectedButtonInGroup(HEADER_HEIGHT_SETTINGS_TEST_ID),
      getHeaderHeightCustomValue: () => getNumberInput(HEADER_HEIGHT_SETTINGS_TEST_ID),
      selectHeaderHeightOption: selectOptionFromButtonGroup(HEADER_HEIGHT_SETTINGS_TEST_ID),
      getPaginationSwitch,
      clickPaginationSwitch,
    };
  };

  it('should reflect default state in the UI', async () => {
    const {
      getHeaderHeightCustomValue,
      getRowHeightValue,
      getHeaderHeightValue,
      getPaginationSwitch,
    } = await renderAndOpenToolbar();

    expect(getRowHeightValue()).toHaveTextContent(/custom/i);
    expect(getHeaderHeightValue()).toHaveTextContent(/custom/i);
    expect(getHeaderHeightCustomValue()).toHaveValue(3);
    expect(getPaginationSwitch()).not.toBeChecked();
  });

  it('should reflect passed state in the UI', async () => {
    const {
      getRowHeightValue,
      getHeaderHeightValue,
      getPaginationSwitch,
      getHeaderHeightCustomValue,
      getRowHeightCustomValue,
    } = await renderAndOpenToolbar({
      state: {
        ...defaultProps.state,
        rowHeight: 'custom',
        rowHeightLines: 2,
        headerRowHeight: 'custom',
        headerRowHeightLines: 4,
        paging: { size: 10, enabled: true },
      },
    });

    expect(getRowHeightValue()).toHaveTextContent(/custom/i);
    expect(getRowHeightCustomValue()).toHaveValue(2);
    expect(getHeaderHeightValue()).toHaveTextContent(/custom/i);
    expect(getHeaderHeightCustomValue()).toHaveValue(4);
    expect(getPaginationSwitch()).toBeChecked();
  });

  it('should change row height to "Auto" mode when selected', async () => {
    const { selectRowHeightOption } = await renderAndOpenToolbar();

    selectRowHeightOption(/auto/i);
    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenCalledWith(
      expect.objectContaining({ rowHeight: 'auto' })
    );
  });

  it('should toggle pagination on click', async () => {
    const { clickPaginationSwitch } = await renderAndOpenToolbar();

    clickPaginationSwitch();
    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenCalledWith(
      expect.objectContaining({ paging: { enabled: true, size: 10 } })
    );
  });

  it('should change row height to "Custom" mode when selected', async () => {
    const { selectRowHeightOption } = await renderAndOpenToolbar();

    selectRowHeightOption(/custom/i);
    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenCalledWith({
      rowHeight: 'custom',
      rowHeightLines: 1,
    });
  });

  it('should change header height to "Custom" mode', async () => {
    const { selectHeaderHeightOption } = await renderAndOpenToolbar({
      headerRowHeight: 'auto',
    });

    selectHeaderHeightOption(/custom/i);
    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenCalledWith({
      headerRowHeight: 'custom',
      headerRowHeightLines: 3,
    });
  });

  it('should toggle on table pagination', async () => {
    const { clickPaginationSwitch } = await renderAndOpenToolbar();

    clickPaginationSwitch();
    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        paging: defaultPagingState,
      })
    );
  });
  it('should toggle off table pagination', async () => {
    const { clickPaginationSwitch } = await renderAndOpenToolbar({
      state: {
        ...defaultProps.state,
        paging: defaultPagingState,
      },
    });

    clickPaginationSwitch();

    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenCalledWith({
      paging: { ...defaultPagingState, enabled: false },
    });
  });
});
