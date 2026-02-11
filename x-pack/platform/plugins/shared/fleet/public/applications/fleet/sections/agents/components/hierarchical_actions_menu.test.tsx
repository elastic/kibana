/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../mock';

import { HierarchicalActionsMenu } from './hierarchical_actions_menu';
import type { MenuItem } from './hierarchical_actions_menu';

describe('HierarchicalActionsMenu', () => {
  const renderer = createFleetTestRendererMock();

  const mockOnClick = jest.fn();

  const basicMenuItems: MenuItem[] = [
    {
      id: 'action1',
      name: 'Action 1',
      icon: 'pencil',
      onClick: mockOnClick,
      'data-test-subj': 'action1Btn',
    },
    {
      id: 'action2',
      name: 'Action 2',
      icon: 'trash',
      onClick: mockOnClick,
      'data-test-subj': 'action2Btn',
    },
  ];

  const nestedMenuItems: MenuItem[] = [
    {
      id: 'top-action',
      name: 'Top Level Action',
      icon: 'check',
      onClick: mockOnClick,
      'data-test-subj': 'topActionBtn',
    },
    {
      id: 'submenu1',
      name: 'Submenu 1',
      panelTitle: 'Submenu 1',
      children: [
        {
          id: 'sub-action1',
          name: 'Sub Action 1',
          icon: 'gear',
          onClick: mockOnClick,
          'data-test-subj': 'subAction1Btn',
        },
        {
          id: 'sub-action2',
          name: 'Sub Action 2',
          icon: 'refresh',
          onClick: mockOnClick,
          disabled: true,
          'data-test-subj': 'subAction2Btn',
        },
      ],
    },
    {
      id: 'submenu2',
      name: 'Submenu 2',
      panelTitle: 'Submenu 2',
      children: [
        {
          id: 'nested-submenu',
          name: 'Nested Submenu',
          panelTitle: 'Nested Submenu',
          children: [
            {
              id: 'deep-action',
              name: 'Deep Action',
              onClick: mockOnClick,
              'data-test-subj': 'deepActionBtn',
            },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render the menu button', () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu items={basicMenuItems} data-test-subj="testMenuBtn" />
      );

      expect(utils.getByTestId('testMenuBtn')).toBeInTheDocument();
    });

    it('should render custom button when provided', () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={basicMenuItems}
          button={{
            props: { iconType: 'arrowDown', iconSide: 'right', color: 'primary' },
            children: 'Actions',
          }}
          data-test-subj="customBtn"
        />
      );

      expect(utils.getByTestId('customBtn')).toBeInTheDocument();
      expect(utils.getByText('Actions')).toBeInTheDocument();
    });

    it('should open menu when button is clicked', async () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu items={basicMenuItems} data-test-subj="testMenuBtn" />
      );

      fireEvent.click(utils.getByTestId('testMenuBtn'));

      await waitFor(() => {
        expect(utils.getByText('Action 1')).toBeInTheDocument();
        expect(utils.getByText('Action 2')).toBeInTheDocument();
      });
    });
  });

  describe('Controlled mode', () => {
    it('should work in controlled mode with isOpen and onToggle', async () => {
      const onToggle = jest.fn();
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={basicMenuItems}
          isOpen={true}
          onToggle={onToggle}
          data-test-subj="testMenuBtn"
        />
      );

      // Menu should be open
      expect(utils.getByText('Action 1')).toBeInTheDocument();

      // Click button should call onToggle
      fireEvent.click(utils.getByTestId('testMenuBtn'));
      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('should close menu when action is clicked', async () => {
      const onToggle = jest.fn();
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={basicMenuItems}
          isOpen={true}
          onToggle={onToggle}
          data-test-subj="testMenuBtn"
        />
      );

      fireEvent.click(utils.getByTestId('action1Btn'));

      expect(mockOnClick).toHaveBeenCalled();
      expect(onToggle).toHaveBeenCalledWith(false);
    });
  });

  describe('Flat menu items', () => {
    it('should render all action items', async () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={basicMenuItems}
          isOpen={true}
          data-test-subj="testMenuBtn"
        />
      );

      expect(utils.getByTestId('action1Btn')).toBeInTheDocument();
      expect(utils.getByTestId('action2Btn')).toBeInTheDocument();
    });

    it('should call onClick when action item is clicked', async () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={basicMenuItems}
          isOpen={true}
          data-test-subj="testMenuBtn"
        />
      );

      fireEvent.click(utils.getByTestId('action1Btn'));

      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('Nested menu items', () => {
    it('should render top-level items and submenu triggers', async () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={nestedMenuItems}
          isOpen={true}
          data-test-subj="testMenuBtn"
        />
      );

      expect(utils.getByTestId('topActionBtn')).toBeInTheDocument();
      expect(utils.getByText('Submenu 1')).toBeInTheDocument();
      expect(utils.getByText('Submenu 2')).toBeInTheDocument();
    });

    it('should navigate to submenu when submenu item is clicked', async () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={nestedMenuItems}
          isOpen={true}
          data-test-subj="testMenuBtn"
        />
      );

      const submenu1Button = utils.getByText('Submenu 1').closest('button');
      fireEvent.click(submenu1Button!);

      await waitFor(() => {
        expect(utils.getByTestId('subAction1Btn')).toBeInTheDocument();
        expect(utils.getByTestId('subAction2Btn')).toBeInTheDocument();
      });
    });

    it('should show disabled state for disabled submenu items', async () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={nestedMenuItems}
          isOpen={true}
          data-test-subj="testMenuBtn"
        />
      );

      // Navigate to submenu
      const submenu1Button = utils.getByText('Submenu 1').closest('button');
      fireEvent.click(submenu1Button!);

      await waitFor(() => {
        const disabledButton = utils.getByTestId('subAction2Btn');
        expect(disabledButton).toBeDisabled();
      });
    });

    it('should support deeply nested submenus', async () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={nestedMenuItems}
          isOpen={true}
          data-test-subj="testMenuBtn"
        />
      );

      // Navigate to first level submenu
      const submenu2Button = utils.getByText('Submenu 2').closest('button');
      fireEvent.click(submenu2Button!);

      await waitFor(() => {
        expect(utils.getByText('Nested Submenu')).toBeInTheDocument();
      });

      // Navigate to second level submenu
      const nestedSubmenuButton = utils.getByText('Nested Submenu').closest('button');
      fireEvent.click(nestedSubmenuButton!);

      await waitFor(() => {
        expect(utils.getByTestId('deepActionBtn')).toBeInTheDocument();
      });
    });
  });

  describe('Panel titles and back navigation', () => {
    it('should show panel title when navigating to submenu', async () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={nestedMenuItems}
          isOpen={true}
          data-test-subj="testMenuBtn"
        />
      );

      const submenu1Button = utils.getByText('Submenu 1').closest('button');
      fireEvent.click(submenu1Button!);

      await waitFor(() => {
        // The panel title should be visible (EUI shows this as the header)
        expect(utils.getByText('Submenu 1')).toBeInTheDocument();
      });
    });
  });

  describe('Icons', () => {
    it('should render icons for menu items', async () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={basicMenuItems}
          isOpen={true}
          data-test-subj="testMenuBtn"
        />
      );

      // EUI renders icons inside the button, we just verify the buttons are there
      expect(utils.getByTestId('action1Btn')).toBeInTheDocument();
      expect(utils.getByTestId('action2Btn')).toBeInTheDocument();
    });
  });

  describe('Anchor position', () => {
    it('should accept anchorPosition prop', () => {
      // This test verifies the prop is accepted without errors
      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={basicMenuItems}
          anchorPosition="downLeft"
          data-test-subj="testMenuBtn"
        />
      );

      expect(utils.getByTestId('testMenuBtn')).toBeInTheDocument();
    });
  });

  describe('Empty items', () => {
    it('should handle empty items array gracefully', () => {
      const utils = renderer.render(
        <HierarchicalActionsMenu items={[]} isOpen={true} data-test-subj="testMenuBtn" />
      );

      // Menu should render without errors
      expect(utils.getByTestId('testMenuBtn')).toBeInTheDocument();
    });
  });

  describe('Items without onClick', () => {
    it('should handle items without onClick', async () => {
      const itemsWithoutOnClick: MenuItem[] = [
        {
          id: 'no-click',
          name: 'No Click Handler',
          'data-test-subj': 'noClickBtn',
        },
      ];

      const utils = renderer.render(
        <HierarchicalActionsMenu
          items={itemsWithoutOnClick}
          isOpen={true}
          data-test-subj="testMenuBtn"
        />
      );

      expect(utils.getByTestId('noClickBtn')).toBeInTheDocument();
      // Should not throw when clicked
      fireEvent.click(utils.getByTestId('noClickBtn'));
    });
  });
});
