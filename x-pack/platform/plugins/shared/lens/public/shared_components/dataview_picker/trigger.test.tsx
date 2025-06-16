/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TriggerButton } from './trigger';
import { renderWithProviders } from '../../test_utils/test_utils';
import * as ToolbarButtonFile from './toolbar_button';

describe('TriggerButton', () => {
  describe('base version (no icons)', () => {
    it('should render the basic button', () => {
      renderWithProviders(
        <TriggerButton togglePopover={jest.fn()} label={'Trigger label'} dataTestSubj="test-id" />
      );
      expect(screen.getByText('Trigger label')).toBeInTheDocument();
    });

    it('should render the title if provided', () => {
      renderWithProviders(
        <TriggerButton
          togglePopover={jest.fn()}
          label={'Trigger'}
          dataTestSubj="test-id"
          title="My title"
        />
      );
      expect(screen.getByTitle('My title')).toBeInTheDocument();
    });

    it('should call the toggle callback on click', async () => {
      const toggleFn = jest.fn();
      renderWithProviders(
        <TriggerButton
          togglePopover={toggleFn}
          label={'Trigger'}
          dataTestSubj="test-id"
          title="My title"
        />
      );
      await userEvent.click(screen.getByText('Trigger'));

      expect(toggleFn).toHaveBeenCalled();
    });

    it('should render the main label as red if missing', () => {
      const ToolbarButtonSpy = jest.spyOn(ToolbarButtonFile, 'ToolbarButton');
      renderWithProviders(
        <TriggerButton
          togglePopover={jest.fn()}
          label={'Trigger'}
          dataTestSubj="test-id"
          title="My title"
          isMissingCurrent
        />
      );
      expect(ToolbarButtonSpy).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'danger' }),
        {}
      );
    });
  });

  describe('with icons', () => {
    it('should render one icon', () => {
      renderWithProviders(
        <TriggerButton
          togglePopover={jest.fn()}
          label={'Trigger label'}
          dataTestSubj="test-id"
          extraIcons={[
            {
              component: <EuiIcon type={'filterIgnore'} color={'red'} />,
              tooltipValue: 'Ignore global filters',
              'data-test-subj': 'ignore-global-filters',
            },
          ]}
        />
      );

      expect(screen.getByTestId('ignore-global-filters')).toBeInTheDocument();
    });

    it('should render multiple icons', () => {
      const indexes = [1, 2, 3];
      renderWithProviders(
        <TriggerButton
          togglePopover={jest.fn()}
          label={'Trigger label'}
          dataTestSubj="test-id"
          extraIcons={indexes.map((index) => ({
            component: <EuiIcon type={'filterIgnore'} color={'red'} />,
            tooltipValue: 'Ignore global filters',
            'data-test-subj': `ignore-global-filters-${index}`,
          }))}
        />
      );

      for (const index of indexes) {
        expect(screen.getByTestId(`ignore-global-filters-${index}`)).toBeInTheDocument();
      }
    });

    it('should render the value together with the provided component', () => {
      renderWithProviders(
        <TriggerButton
          togglePopover={jest.fn()}
          label={'Trigger label'}
          dataTestSubj="test-id"
          extraIcons={[
            {
              component: <EuiIcon type={'filterIgnore'} color={'red'} />,
              tooltipValue: 'Ignore global filters',
              'data-test-subj': 'ignore-global-filters',
              value: 'Ignore filters',
            },
          ]}
        />
      );

      expect(screen.getByText('Ignore filters')).toBeInTheDocument();
    });
  });
});
