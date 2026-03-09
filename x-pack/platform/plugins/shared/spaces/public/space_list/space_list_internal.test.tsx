/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';

import { SpaceListInternal } from './space_list_internal';
import type { SpaceListProps } from './types';
import type { Space } from '../../common';
import { getSpacesContextProviderWrapper } from '../spaces_context';
import { spacesManagerMock } from '../spaces_manager/mocks';

const ACTIVE_SPACE: Space = {
  id: 'default',
  name: 'Default',
  initials: 'D!',
  disabledFeatures: [],
};
const getSpaceData = (inactiveSpaceCount: number = 0) => {
  const inactive = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']
    .map<Space>((name) => {
      const id = name.toLowerCase();
      return { id, name, disabledFeatures: [`${id}-feature`] };
    })
    .slice(0, inactiveSpaceCount);
  const spaces = [ACTIVE_SPACE, ...inactive];
  const namespaces = spaces.map(({ id }) => id);
  return { spaces, namespaces };
};

describe('SpaceListInternal', () => {
  const createSpaceList = async ({
    spaces,
    props,
    feature,
  }: {
    spaces: Space[];
    props: SpaceListProps;
    feature?: string;
  }) => {
    const { getStartServices } = coreMock.createSetup();
    const spacesManager = spacesManagerMock.create();
    spacesManager.getActiveSpace.mockResolvedValue(ACTIVE_SPACE);
    spacesManager.getSpaces.mockResolvedValue(spaces);

    const SpacesContext = await getSpacesContextProviderWrapper({
      getStartServices,
      spacesManager,
    });

    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <I18nProvider>
          <SpacesContext feature={feature}>
            <SpaceListInternal {...props} />
          </SpacesContext>
        </I18nProvider>
      );
    });

    return result!;
  };

  function getListText(container: HTMLElement) {
    const flexItems = container.querySelectorAll('.euiFlexItem');
    return Array.from(flexItems).map((el) => el.textContent || '');
  }

  function getButton(container: HTMLElement) {
    return container.querySelector('[class*="euiButtonEmpty"]') as HTMLElement | null;
  }

  describe('using default properties', () => {
    describe('with only the active space', () => {
      const { spaces, namespaces } = getSpaceData();

      it('does not show badges or button', async () => {
        const { container } = await createSpaceList({ spaces, props: { namespaces } });
        expect(getListText(container)).toHaveLength(0);
        expect(getButton(container)).toBeNull();
      });
    });

    describe('with the active space and one inactive space', () => {
      const { spaces, namespaces } = getSpaceData(1);

      it('shows one badge without button', async () => {
        const { container } = await createSpaceList({ spaces, props: { namespaces } });
        expect(getListText(container)).toEqual(['A']);
        expect(getButton(container)).toBeNull();
      });
    });

    describe('with the active space and five inactive spaces', () => {
      const { spaces, namespaces } = getSpaceData(5);

      it('shows badges without button', async () => {
        const { container } = await createSpaceList({ spaces, props: { namespaces } });
        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E']);
        expect(getButton(container)).toBeNull();
      });
    });

    describe('with the active space, five inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(5);

      it('shows badges without button', async () => {
        const { container } = await createSpaceList({
          spaces,
          props: { namespaces: [...namespaces, '?'] },
        });
        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E', '+1']);
        expect(getButton(container)).toBeNull();
      });
    });

    describe('with the active space, five inactive spaces, and two unauthorized spaces', () => {
      const { spaces, namespaces } = getSpaceData(5);

      it('shows badges without button', async () => {
        const { container } = await createSpaceList({
          spaces,
          props: { namespaces: [...namespaces, '?', '?'] },
        });
        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E', '+2']);
        expect(getButton(container)).toBeNull();
      });
    });

    describe('with the active space and six inactive spaces', () => {
      const { spaces, namespaces } = getSpaceData(6);

      it('shows badges with button', async () => {
        const { container } = await createSpaceList({ spaces, props: { namespaces } });
        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E']);

        const button = getButton(container);
        expect(button).not.toBeNull();
        expect(button!.textContent).toEqual('+1 more');

        await userEvent.click(button!);

        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
        expect(button!.textContent).toEqual('show less');
      });
    });

    describe('with the active space, six inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(6);

      it('shows badges with button', async () => {
        const { container } = await createSpaceList({
          spaces,
          props: { namespaces: [...namespaces, '?'] },
        });
        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E']);

        const button = getButton(container);
        expect(button).not.toBeNull();
        expect(button!.textContent).toEqual('+2 more');

        await userEvent.click(button!);

        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', '+1']);
        expect(button!.textContent).toEqual('show less');
      });
    });

    describe('with the active space, six inactive spaces, and two unauthorized spaces', () => {
      const { spaces, namespaces } = getSpaceData(6);

      it('shows badges with button', async () => {
        const { container } = await createSpaceList({
          spaces,
          props: { namespaces: [...namespaces, '?', '?'] },
        });
        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E']);

        const button = getButton(container);
        expect(button).not.toBeNull();
        expect(button!.textContent).toEqual('+3 more');

        await userEvent.click(button!);

        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', '+2']);
        expect(button!.textContent).toEqual('show less');
      });
    });

    describe('with only "all spaces"', () => {
      it('shows one badge without button', async () => {
        const { container } = await createSpaceList({
          spaces: [],
          props: { namespaces: ['*'] },
        });
        expect(getListText(container)).toEqual(['*']);
        expect(getButton(container)).toBeNull();
      });
    });

    describe('with "all spaces", the active space, six inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(6);

      it('shows one badge without button', async () => {
        const { container } = await createSpaceList({
          spaces,
          props: { namespaces: ['*', ...namespaces, '?'] },
        });
        expect(getListText(container)).toEqual(['*']);
        expect(getButton(container)).toBeNull();
      });
    });
  });

  describe('using custom properties', () => {
    describe('with the active space, eight inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(8);

      it('with displayLimit=0, shows badges without button', async () => {
        const listOnClick = jest.fn();
        const { container } = await createSpaceList({
          spaces,
          props: { namespaces: [...namespaces, '?'], displayLimit: 0, listOnClick },
        });
        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '+1']);
        expect(getButton(container)).toBeNull();

        await userEvent.click(screen.getByTestId('space-avatar-alpha'));
        expect(listOnClick).toHaveBeenCalledTimes(1);
      });

      it('with displayLimit=1, shows badges with button', async () => {
        const listOnClick = jest.fn();
        const { container } = await createSpaceList({
          spaces,
          props: { namespaces: [...namespaces, '?'], displayLimit: 1, listOnClick },
        });
        expect(getListText(container)).toEqual(['A']);

        const button = getButton(container);
        expect(button).not.toBeNull();
        expect(button!.textContent).toEqual('+8 more');

        await userEvent.click(button!);

        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '+1']);
        expect(button!.textContent).toEqual('show less');

        await userEvent.click(screen.getByTestId('space-avatar-alpha'));
        expect(listOnClick).toHaveBeenCalledTimes(1);
      });

      it('with displayLimit=7, shows badges with button', async () => {
        const { container } = await createSpaceList({
          spaces,
          props: { namespaces: [...namespaces, '?'], displayLimit: 7 },
        });
        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);

        const button = getButton(container);
        expect(button).not.toBeNull();
        expect(button!.textContent).toEqual('+2 more');

        await userEvent.click(button!);

        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '+1']);
        expect(button!.textContent).toEqual('show less');
      });

      it('with displayLimit=8, shows badges without button', async () => {
        const { container } = await createSpaceList({
          spaces,
          props: { namespaces: [...namespaces, '?'], displayLimit: 8 },
        });
        expect(getListText(container)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '+1']);
        expect(getButton(container)).toBeNull();
      });

      it('with behaviorContext="outside-space", shows badges with button', async () => {
        const { container } = await createSpaceList({
          spaces,
          props: {
            namespaces: [...namespaces, '?'],
            behaviorContext: 'outside-space',
          } as SpaceListProps,
        });
        expect(getListText(container)).toEqual(['D!', 'A', 'B', 'C', 'D']);

        const button = getButton(container);
        expect(button).not.toBeNull();
        expect(button!.textContent).toEqual('+5 more');

        await userEvent.click(button!);

        expect(getListText(container)).toEqual([
          'D!',
          'A',
          'B',
          'C',
          'D',
          'E',
          'F',
          'G',
          'H',
          '+1',
        ]);
        expect(button!.textContent).toEqual('show less');
      });
    });
  });

  describe('with a SpacesContext for a specific feature', () => {
    describe('with the active space, eight inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(8);

      it('shows badges with button, showing disabled features at the end of the list', async () => {
        const { container } = await createSpaceList({
          spaces,
          props: { namespaces: [...namespaces, '?'] },
          feature: 'bravo-feature',
        });
        expect(getListText(container)).toEqual(['A', 'C', 'D', 'E', 'F']);

        const button = getButton(container);
        expect(button).not.toBeNull();
        expect(button!.textContent).toEqual('+4 more');

        await userEvent.click(button!);

        expect(getListText(container)).toEqual(['A', 'C', 'D', 'E', 'F', 'G', 'H', 'B', '+1']);
        expect(button!.textContent).toEqual('show less');
      });
    });
  });
});
