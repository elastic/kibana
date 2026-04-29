/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectable } from '@elastic/eui';
import Boom from '@hapi/boom';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import type { SavedObjectReferenceWithContext } from '@kbn/core-saved-objects-api-server';
import { I18nProvider } from '@kbn/i18n-react';

import { AliasTable } from './alias_table';
import { RelativesFooter } from './relatives_footer';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { ShareModeControl } from './share_mode_control';
import { getShareToSpaceFlyoutComponent } from './share_to_space_flyout';
import type { Space } from '../../../common';
import { ALL_SPACES_ID } from '../../../common/constants';
import { getSpacesContextProviderWrapper } from '../../spaces_context';
import { spacesManagerMock } from '../../spaces_manager/mocks';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiSelectable: jest.fn((props: any) => <actual.EuiSelectable {...props} />),
  };
});

jest.mock('./selectable_spaces_control', () => {
  const actual = jest.requireActual('./selectable_spaces_control');
  return {
    SelectableSpacesControl: jest.fn((props: any) => <actual.SelectableSpacesControl {...props} />),
  };
});

jest.mock('./share_mode_control', () => {
  const actual = jest.requireActual('./share_mode_control');
  return {
    ShareModeControl: jest.fn((props: any) => <actual.ShareModeControl {...props} />),
  };
});

jest.mock('./alias_table', () => {
  const actual = jest.requireActual('./alias_table');
  return {
    AliasTable: jest.fn((props: any) => <actual.AliasTable {...props} />),
  };
});

jest.mock('./relatives_footer', () => {
  const actual = jest.requireActual('./relatives_footer');
  return {
    RelativesFooter: jest.fn((props: any) => <actual.RelativesFooter {...props} />),
  };
});

jest.mock('../../copy_saved_objects_to_space/components/copy_to_space_flyout_internal', () => ({
  CopyToSpaceFlyoutInternal: () => <div data-test-subj="copy-to-space-flyout" />,
}));

const MockedSelectableSpacesControl = SelectableSpacesControl as unknown as jest.MockedFunction<
  typeof SelectableSpacesControl
>;
const MockedShareModeControl = ShareModeControl as unknown as jest.MockedFunction<
  typeof ShareModeControl
>;
const MockedAliasTable = AliasTable as unknown as jest.MockedFunction<typeof AliasTable>;
const MockedRelativesFooter = RelativesFooter as unknown as jest.MockedFunction<
  typeof RelativesFooter
>;
const MockedEuiSelectable = EuiSelectable as unknown as jest.Mock;

interface SetupOpts {
  mockSpaces?: Space[];
  namespaces?: string[];
  returnBeforeSpacesLoad?: boolean;
  canShareToAllSpaces?: boolean; // default: true
  enableCreateCopyCallout?: boolean;
  enableCreateNewSpaceLink?: boolean;
  behaviorContext?: 'within-space' | 'outside-space';
  mockFeatureId?: string; // optional feature ID to use for the SpacesContext
  additionalShareableReferences?: SavedObjectReferenceWithContext[];
}

const setup = async (opts: SetupOpts = {}) => {
  const onClose = jest.fn();
  const onUpdate = jest.fn();

  const mockSpacesManager = spacesManagerMock.create();

  // note: this call is made in the SpacesContext
  mockSpacesManager.getActiveSpace.mockResolvedValue({
    id: 'my-active-space',
    name: 'my active space',
    disabledFeatures: [],
  });

  // note: this call is made in the SpacesContext
  mockSpacesManager.getSpaces.mockResolvedValue(
    opts.mockSpaces || [
      {
        id: 'space-1',
        name: 'Space 1',
        disabledFeatures: [],
      },
      {
        id: 'space-2',
        name: 'Space 2',
        disabledFeatures: [],
      },
      {
        id: 'space-3',
        name: 'Space 3',
        disabledFeatures: [],
      },
      {
        id: 'my-active-space',
        name: 'my active space',
        disabledFeatures: [],
      },
    ]
  );

  mockSpacesManager.getShareSavedObjectPermissions.mockResolvedValue({
    shareToAllSpaces: opts.canShareToAllSpaces ?? true,
  });

  const savedObjectToShare = {
    type: 'dashboard',
    id: 'my-dash',
    namespaces: opts.namespaces || ['my-active-space', 'space-1'],
    icon: 'dashboard',
    title: 'foo',
  };

  const shareableReferencesResult = {
    objects: [
      {
        // this is the result for the saved object target; by default, it has no references
        type: savedObjectToShare.type,
        id: savedObjectToShare.id,
        spaces: savedObjectToShare.namespaces,
        inboundReferences: [],
      },
      ...(opts.additionalShareableReferences ?? []),
    ],
  };

  let resolveSpacesData: (() => void) | undefined;
  if (opts.returnBeforeSpacesLoad) {
    mockSpacesManager.getShareableReferences.mockReturnValue(
      new Promise((resolve) => {
        resolveSpacesData = () => resolve(shareableReferencesResult);
      })
    );
  } else {
    mockSpacesManager.getShareableReferences.mockResolvedValue(shareableReferencesResult);
  }

  const { getStartServices } = coreMock.createSetup();
  const startServices = coreMock.createStart();
  startServices.application.capabilities = {
    ...startServices.application.capabilities,
    spaces: { manage: true },
  };
  const mockToastNotifications = startServices.notifications.toasts;
  getStartServices.mockResolvedValue([startServices, , ,]);

  const SpacesContext = await getSpacesContextProviderWrapper({
    getStartServices,
    spacesManager: mockSpacesManager,
  });
  const ShareToSpaceFlyout = await getShareToSpaceFlyoutComponent();

  render(
    <I18nProvider>
      <SpacesContext feature={opts.mockFeatureId}>
        <ShareToSpaceFlyout
          savedObjectTarget={savedObjectToShare}
          onUpdate={onUpdate}
          onClose={onClose}
          enableCreateCopyCallout={opts.enableCreateCopyCallout}
          enableCreateNewSpaceLink={opts.enableCreateNewSpaceLink}
          behaviorContext={opts.behaviorContext}
        />
      </SpacesContext>
    </I18nProvider>
  );

  if (!opts.returnBeforeSpacesLoad) {
    await waitFor(() => {
      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
    });
  } else {
    await waitFor(() => {
      expect(screen.getByTestId('share-to-space-flyout')).toBeInTheDocument();
    });
  }

  return {
    onClose,
    mockSpacesManager,
    mockToastNotifications,
    savedObjectToShare,
    resolveSpacesData,
  };
};

function changeSpaceSelection(selectedSpaces: string[]) {
  const lastCall = MockedSelectableSpacesControl.mock.calls.at(-1)!;
  act(() => {
    lastCall[0].onChange(selectedSpaces);
  });
}

async function clickButton(button: 'continue' | 'save' | 'copy') {
  const buttonNode = screen.getByTestId(`sts-${button}-button`);
  await act(async () => {
    buttonNode.click();
  });
}

beforeEach(() => {
  MockedSelectableSpacesControl.mockClear();
  MockedShareModeControl.mockClear();
  MockedAliasTable.mockClear();
  MockedRelativesFooter.mockClear();
  MockedEuiSelectable.mockClear();
});

describe('ShareToSpaceFlyout', () => {
  it('waits for spaces to load', async () => {
    const { resolveSpacesData } = await setup({ returnBeforeSpacesLoad: true });

    expect(screen.queryByTestId('share-mode-control-description')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeInTheDocument();

    await act(async () => {
      resolveSpacesData!();
    });

    await waitFor(() => {
      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
    });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();
  });

  describe('without enableCreateCopyCallout', () => {
    it('does not show a warning callout when the saved object only has one namespace', async () => {
      const { onClose } = await setup({
        namespaces: ['my-active-space'],
      });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByTestId('sts-copy-button')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(0);
    });
  });

  describe('with enableCreateCopyCallout', () => {
    const enableCreateCopyCallout = true;

    it('does not show a warning callout when the saved object has multiple namespaces', async () => {
      const { onClose } = await setup({ enableCreateCopyCallout });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByTestId('sts-copy-button')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('shows a warning callout when the saved object only has one namespace', async () => {
      const { onClose } = await setup({
        enableCreateCopyCallout,
        namespaces: ['my-active-space'],
      });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.getByTestId('sts-copy-button')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('does not show the Copy flyout by default', async () => {
      const { onClose } = await setup({
        enableCreateCopyCallout,
        namespaces: ['my-active-space'],
      });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByTestId('copy-to-space-flyout')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('shows the Copy flyout if the the "Make a copy" button is clicked', async () => {
      const { onClose } = await setup({
        enableCreateCopyCallout,
        namespaces: ['my-active-space'],
      });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();

      await clickButton('copy');

      await waitFor(() => {
        expect(screen.getByTestId('copy-to-space-flyout')).toBeInTheDocument();
      });
      expect(onClose).toHaveBeenCalledTimes(0);
    });
  });

  describe('without enableCreateNewSpaceLink', () => {
    it('does not render a NoSpacesAvailable component when no spaces are available', async () => {
      const { onClose } = await setup({
        mockSpaces: [{ id: 'my-active-space', name: 'my active space', disabledFeatures: [] }],
      });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('does not render a NoSpacesAvailable component when only the active space is available', async () => {
      const { onClose } = await setup({
        mockSpaces: [{ id: 'my-active-space', name: '', disabledFeatures: [] }],
      });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(0);
    });
  });

  describe('with enableCreateNewSpaceLink', () => {
    const enableCreateNewSpaceLink = true;

    it('renders a NoSpacesAvailable component when no spaces are available', async () => {
      const { onClose } = await setup({
        enableCreateNewSpaceLink,
        mockSpaces: [{ id: 'my-active-space', name: 'my active space', disabledFeatures: [] }],
      });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByTestId('sts-new-space-link')).toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('renders a NoSpacesAvailable component when only the active space is available', async () => {
      const { onClose } = await setup({
        enableCreateNewSpaceLink,
        mockSpaces: [{ id: 'my-active-space', name: '', disabledFeatures: [] }],
      });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByTestId('sts-new-space-link')).toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(0);
    });
  });

  it('handles errors thrown from shareSavedObjectsAdd API call', async () => {
    const { mockSpacesManager, mockToastNotifications } = await setup();

    mockSpacesManager.updateSavedObjectsSpaces.mockRejectedValue(
      Boom.serverUnavailable('Something bad happened')
    );

    expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();

    changeSpaceSelection(['space-2', 'space-3']);
    await clickButton('save');

    expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenCalled();
    expect(mockToastNotifications.addError).toHaveBeenCalled();
  });

  it('allows the form to be filled out to add a space', async () => {
    const { onClose, mockSpacesManager, mockToastNotifications, savedObjectToShare } =
      await setup();

    expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();

    changeSpaceSelection(['space-1', 'space-2', 'space-3']);
    await clickButton('save');

    const { type, id } = savedObjectToShare;
    expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenCalledWith(
      [{ type, id }],
      ['space-2', 'space-3'],
      []
    );

    expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows the form to be filled out to remove a space', async () => {
    const { onClose, mockSpacesManager, mockToastNotifications, savedObjectToShare } =
      await setup();

    expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();

    changeSpaceSelection([]);
    await clickButton('save');

    const { type, id } = savedObjectToShare;
    expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenCalledWith(
      [{ type, id }],
      [],
      ['space-1']
    );

    expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows the form to be filled out to add and remove a space', async () => {
    const { onClose, mockSpacesManager, mockToastNotifications, savedObjectToShare } =
      await setup();

    expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();

    changeSpaceSelection(['space-2', 'space-3']);
    await clickButton('save');

    const { type, id } = savedObjectToShare;
    expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenCalledWith(
      [{ type, id }],
      ['space-2', 'space-3'],
      ['space-1']
    );

    expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('handles related objects correctly', () => {
    const relatedObject = {
      type: 'index-pattern',
      id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      spaces: ['my-active-space', 'space-1'],
      inboundReferences: [
        {
          type: 'dashboard',
          id: 'my-dash',
          name: 'foo',
        },
      ],
    };

    it('adds spaces to related objects when only adding spaces', async () => {
      const { onClose, mockSpacesManager, mockToastNotifications, savedObjectToShare } =
        await setup({
          additionalShareableReferences: [relatedObject],
        });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();

      changeSpaceSelection(['space-1', 'space-2']);
      await clickButton('save');

      const expectedObjects: Array<{ type: string; id: string }> = [
        savedObjectToShare,
        relatedObject,
      ].map(({ type, id }) => ({
        type,
        id,
      }));
      expect(mockSpacesManager.updateSavedObjectsSpaces).toBeCalledTimes(1);
      expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenCalledWith(
        expectedObjects,
        ['space-2'],
        []
      );

      expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
      expect(mockToastNotifications.addError).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not remove spaces from related objects when only removing spaces', async () => {
      const { onClose, mockSpacesManager, mockToastNotifications, savedObjectToShare } =
        await setup({
          additionalShareableReferences: [relatedObject],
        });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();

      changeSpaceSelection([]);
      await clickButton('save');

      expect(mockSpacesManager.updateSavedObjectsSpaces).toBeCalledTimes(1);
      expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenCalledWith(
        [{ type: savedObjectToShare.type, id: savedObjectToShare.id }],
        [],
        ['space-1']
      );

      expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
      expect(mockToastNotifications.addError).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('adds spaces but does not remove spaces from related objects when adding and removing spaces', async () => {
      const { onClose, mockSpacesManager, mockToastNotifications, savedObjectToShare } =
        await setup({
          additionalShareableReferences: [relatedObject],
        });

      expect(screen.getByTestId('share-mode-control-description')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sts-new-space-link')).not.toBeInTheDocument();

      changeSpaceSelection(['space-2', 'space-3']);
      await clickButton('save');

      expect(mockSpacesManager.updateSavedObjectsSpaces).toBeCalledTimes(2);
      expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenNthCalledWith(
        1,
        [{ type: savedObjectToShare.type, id: savedObjectToShare.id }],
        ['space-2', 'space-3'],
        ['space-1']
      );
      expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenNthCalledWith(
        2,
        [{ type: relatedObject.type, id: relatedObject.id }],
        ['space-2', 'space-3'],
        []
      );

      expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
      expect(mockToastNotifications.addError).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('correctly renders share mode control', () => {
    function getDescriptionAndWarning() {
      const descriptionNode = screen.getByTestId('share-mode-control-description');
      const lastCall = MockedShareModeControl.mock.calls.at(-1)!;
      return {
        description: descriptionNode.textContent,
        isPrivilegeTooltipDisplayed: !lastCall[0].canShareToAllSpaces,
      };
    }

    describe('when user has privileges to share to all spaces', () => {
      const canShareToAllSpaces = true;

      it('and the object is not shared to all spaces', async () => {
        const namespaces = ['my-active-space'];
        await setup({ canShareToAllSpaces, namespaces });
        const { description, isPrivilegeTooltipDisplayed } = getDescriptionAndWarning();

        expect(description).toMatchInlineSnapshot(
          `"Make object available in selected spaces only."`
        );
        expect(isPrivilegeTooltipDisplayed).toBe(false);
      });

      it('and the object is shared to all spaces', async () => {
        const namespaces = [ALL_SPACES_ID];
        await setup({ canShareToAllSpaces, namespaces });
        const { description, isPrivilegeTooltipDisplayed } = getDescriptionAndWarning();

        expect(description).toMatchInlineSnapshot(
          `"Make object available in all current and future spaces."`
        );
        expect(isPrivilegeTooltipDisplayed).toBe(false);
      });
    });

    describe('when user does not have privileges to share to all spaces', () => {
      const canShareToAllSpaces = false;

      it('and the object is not shared to all spaces', async () => {
        const namespaces = ['my-active-space'];
        await setup({ canShareToAllSpaces, namespaces });
        const { description, isPrivilegeTooltipDisplayed } = getDescriptionAndWarning();

        expect(description).toMatchInlineSnapshot(
          `"Make object available in selected spaces only."`
        );
        expect(isPrivilegeTooltipDisplayed).toBe(true);
      });

      it('and the object is shared to all spaces', async () => {
        const namespaces = [ALL_SPACES_ID];
        await setup({ canShareToAllSpaces, namespaces });
        const { description, isPrivilegeTooltipDisplayed } = getDescriptionAndWarning();

        expect(description).toMatchInlineSnapshot(
          `"Make object available in all current and future spaces."`
        );
        expect(isPrivilegeTooltipDisplayed).toBe(true);
      });
    });
  });

  describe('space selection', () => {
    const mockFeatureId = 'some-feature';

    const mockSpaces = [
      {
        // normal "fully authorized" space selection option -- not the active space
        id: 'space-1',
        name: 'Space 1',
        disabledFeatures: [],
      },
      {
        // normal "fully authorized" space selection option, with a disabled feature -- not the active space
        id: 'space-2',
        name: 'Space 2',
        disabledFeatures: [mockFeatureId],
      },
      {
        // "partially authorized" space selection option -- not the active space
        id: 'space-3',
        name: 'Space 3',
        disabledFeatures: [],
        authorizedPurposes: { shareSavedObjectsIntoSpace: false },
      },
      {
        // "partially authorized" space selection option, with a disabled feature -- not the active space
        id: 'space-4',
        name: 'Space 4',
        disabledFeatures: [mockFeatureId],
        authorizedPurposes: { shareSavedObjectsIntoSpace: false },
      },
      {
        // "active space" selection option (determined by an ID that matches the result of `getActiveSpace`, mocked at top)
        id: 'my-active-space',
        name: 'my active space',
        disabledFeatures: [],
      },
    ];

    function getSelectableOptions() {
      const selectableCalls = MockedEuiSelectable.mock.calls.filter(
        (call) => call[0].listProps?.['data-test-subj'] === 'sts-form-space-selector'
      );
      return selectableCalls.at(-1)![0].options;
    }

    const expectActiveSpace = (option: any, { spaceId }: { spaceId: string }) => {
      expect(option['data-space-id']).toEqual(spaceId);
      expect(option.append).toMatchInlineSnapshot(`
        <EuiBadge
          color="hollow"
        >
          This space
        </EuiBadge>
      `);
      // by definition, the active space will always be checked
      expect(option.checked).toEqual('on');
      expect(option.disabled).toEqual(true);
    };
    const expectNeedAdditionalPrivileges = (
      option: any,
      {
        spaceId,
        checked,
        featureIsDisabled,
      }: { spaceId: string; checked: boolean; featureIsDisabled?: boolean }
    ) => {
      expect(option['data-space-id']).toEqual(spaceId);
      if (checked && featureIsDisabled) {
        expect(option.append).toMatchInlineSnapshot(`
          <React.Fragment>
            <EuiIconTip
              content="You need additional privileges to deselect this space."
              position="left"
              type="info"
            />
            <EuiIconTip
              color="warning"
              content="This feature is disabled in this space."
              position="left"
              type="warning"
            />
          </React.Fragment>
        `);
      } else if (checked && !featureIsDisabled) {
        expect(option.append).toMatchInlineSnapshot(`
          <React.Fragment>
            <EuiIconTip
              content="You need additional privileges to deselect this space."
              position="left"
              type="info"
            />
          </React.Fragment>
        `);
      } else if (!checked && !featureIsDisabled) {
        expect(option.append).toMatchInlineSnapshot(`
          <React.Fragment>
            <EuiIconTip
              content="You need additional privileges to select this space."
              position="left"
              type="info"
            />
          </React.Fragment>
        `);
      } else {
        throw new Error('Unexpected test case!');
      }
      expect(option.checked).toEqual(checked ? 'on' : undefined);
      expect(option.disabled).toEqual(true);
    };
    const expectFeatureIsDisabled = (option: any, { spaceId }: { spaceId: string }) => {
      expect(option['data-space-id']).toEqual(spaceId);
      expect(option.append).toMatchInlineSnapshot(`
        <EuiIconTip
          color="warning"
          content="This feature is disabled in this space."
          position="left"
          type="warning"
        />
      `);
      expect(option.checked).toEqual('on');
      expect(option.disabled).toBeUndefined();
    };
    const expectInactiveSpace = (
      option: any,
      { spaceId, checked }: { spaceId: string; checked: boolean }
    ) => {
      expect(option['data-space-id']).toEqual(spaceId);
      expect(option.append).toBeUndefined();
      expect(option.checked).toEqual(checked ? 'on' : undefined);
      expect(option.disabled).toBeUndefined();
    };

    describe('with behaviorContext="within-space" (default)', () => {
      it('correctly defines space selection options', async () => {
        const namespaces = ['my-active-space', 'space-1', 'space-3']; // the saved object's current namespaces
        await setup({ mockSpaces, namespaces });

        const options = getSelectableOptions();
        expect(options).toHaveLength(5);
        expectActiveSpace(options[0], { spaceId: 'my-active-space' });
        expectInactiveSpace(options[1], { spaceId: 'space-1', checked: true });
        expectInactiveSpace(options[2], { spaceId: 'space-2', checked: false });
        expectNeedAdditionalPrivileges(options[3], { spaceId: 'space-3', checked: true });
        expectNeedAdditionalPrivileges(options[4], { spaceId: 'space-4', checked: false });
      });

      describe('with a SpacesContext for a specific feature', () => {
        it('correctly defines space selection options when affected spaces are not selected', async () => {
          const namespaces = ['my-active-space']; // the saved object's current namespaces
          await setup({ mockSpaces, namespaces, mockFeatureId });

          const options = getSelectableOptions();
          expect(options).toHaveLength(3);
          expectActiveSpace(options[0], { spaceId: 'my-active-space' });
          expectInactiveSpace(options[1], { spaceId: 'space-1', checked: false });
          expectNeedAdditionalPrivileges(options[2], { spaceId: 'space-3', checked: false });
          // space-2 and space-4 are omitted, because they are not selected and the current feature is disabled in those spaces
        });

        it('correctly defines space selection options when affected spaces are already selected', async () => {
          const namespaces = ['my-active-space', 'space-1', 'space-2', 'space-3', 'space-4']; // the saved object's current namespaces
          await setup({ mockSpaces, namespaces, mockFeatureId });

          const options = getSelectableOptions();
          expect(options).toHaveLength(5);
          expectActiveSpace(options[0], { spaceId: 'my-active-space' });
          expectInactiveSpace(options[1], { spaceId: 'space-1', checked: true });
          expectNeedAdditionalPrivileges(options[2], { spaceId: 'space-3', checked: true });
          // space-2 and space-4 are at the end, because they are selected and the current feature is disabled in those spaces
          expectFeatureIsDisabled(options[3], { spaceId: 'space-2' });
          expectNeedAdditionalPrivileges(options[4], {
            spaceId: 'space-4',
            checked: true,
            featureIsDisabled: true,
          });
        });
      });
    });

    describe('with behaviorContext="outside-space"', () => {
      const behaviorContext = 'outside-space';

      it('correctly defines space selection options', async () => {
        const namespaces = ['my-active-space', 'space-1', 'space-3']; // the saved object's current namespaces
        await setup({ behaviorContext, mockSpaces, namespaces });

        const options = getSelectableOptions();
        expect(options).toHaveLength(5);
        expectInactiveSpace(options[0], { spaceId: 'space-1', checked: true });
        expectInactiveSpace(options[1], { spaceId: 'space-2', checked: false });
        expectNeedAdditionalPrivileges(options[2], { spaceId: 'space-3', checked: true });
        expectNeedAdditionalPrivileges(options[3], { spaceId: 'space-4', checked: false });
        expectInactiveSpace(options[4], { spaceId: 'my-active-space', checked: true });
      });
    });
  });

  describe('alias list', () => {
    it('shows only aliases for spaces that exist', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      await setup({
        namespaces,
        additionalShareableReferences: [
          // it doesn't matter if aliases are for the saved object target or for references; this is easier to mock
          {
            type: 'foo',
            id: '1',
            spaces: namespaces,
            inboundReferences: [],
            spacesWithMatchingAliases: ['space-1', 'some-space-that-does-not-exist'], // space-1 exists, it is mocked at the top
          },
        ],
      });

      changeSpaceSelection(['*']);
      await clickButton('continue');

      const lastAliasCall = MockedAliasTable.mock.calls.at(-1)!;
      expect(lastAliasCall[0].aliasesToDisable).toEqual([
        { targetType: 'foo', sourceId: '1', targetSpace: 'space-1', spaceExists: true },
        {
          // this alias is present, and it will be disabled, but it is not displayed in the table below due to the 'spaceExists' field
          targetType: 'foo',
          sourceId: '1',
          targetSpace: 'some-space-that-does-not-exist',
          spaceExists: false,
        },
      ]);
      expect(screen.getByText('Legacy URL conflict')).toBeInTheDocument();
      expect(screen.getByText(/1 legacy URL will be disabled/)).toBeInTheDocument();
    });

    it('shows only aliases for selected spaces', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      await setup({
        namespaces,
        additionalShareableReferences: [
          // it doesn't matter if aliases are for the saved object target or for references; this is easier to mock
          {
            type: 'foo',
            id: '1',
            spaces: namespaces,
            inboundReferences: [],
            spacesWithMatchingAliases: ['space-1', 'space-2'], // space-1 and space-2 both exist, they are mocked at the top
          },
        ],
      });

      changeSpaceSelection(['space-1']);
      await clickButton('continue');

      const lastAliasCall = MockedAliasTable.mock.calls.at(-1)!;
      expect(lastAliasCall[0].aliasesToDisable).toEqual([
        { targetType: 'foo', sourceId: '1', targetSpace: 'space-1', spaceExists: true },
        // even though an alias exists for space-2, it will not be disabled, because we aren't sharing to that space
      ]);
      expect(screen.getByText('Legacy URL conflict')).toBeInTheDocument();
      expect(screen.getByText(/1 legacy URL will be disabled/)).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('does not show a description of relatives (references) if there are none', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      await setup({ namespaces });

      expect(screen.queryByText(/related.*will also change/)).not.toBeInTheDocument();
    });

    it('shows a description of filtered relatives (references)', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      await setup({
        namespaces,
        additionalShareableReferences: [
          // the saved object target is already included in the mock results by default; it will not be counted
          { type: 'foo', id: '1', spaces: [], inboundReferences: [] }, // this will not be counted because spaces is empty (it may not be a shareable type)
          { type: 'foo', id: '2', spaces: namespaces, inboundReferences: [], isMissing: true }, // this will not be counted because isMissing === true
          { type: 'foo', id: '3', spaces: namespaces, inboundReferences: [] }, // this will be counted
        ],
      });

      expect(screen.getByText(/1 related object will also change/)).toBeInTheDocument();
    });

    function expectButton(button: 'save' | 'continue') {
      if (button === 'save') {
        expect(screen.queryByTestId('sts-save-button')).toBeInTheDocument();
        expect(screen.queryByTestId('sts-continue-button')).not.toBeInTheDocument();
      } else {
        expect(screen.queryByTestId('sts-save-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('sts-continue-button')).toBeInTheDocument();
      }
    }

    it('shows a save button if there are no legacy URL aliases to disable', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      await setup({ namespaces });

      changeSpaceSelection(['*']);
      expectButton('save');
    });

    it('shows a save button if there are legacy URL aliases to disable, but none for existing spaces', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      await setup({
        namespaces,
        additionalShareableReferences: [
          // it doesn't matter if aliases are for the saved object target or for references; this is easier to mock
          {
            type: 'foo',
            id: '1',
            spaces: namespaces,
            inboundReferences: [],
            spacesWithMatchingAliases: ['some-space-that-does-not-exist'],
          },
        ],
      });

      changeSpaceSelection(['*']);
      expectButton('save');
    });

    it('shows a continue button if there are legacy URL aliases to disable for existing spaces', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      await setup({
        namespaces,
        additionalShareableReferences: [
          // it doesn't matter if aliases are for the saved object target or for references; this is easier to mock
          {
            type: 'foo',
            id: '1',
            spaces: namespaces,
            inboundReferences: [],
            spacesWithMatchingAliases: ['space-1', 'some-space-that-does-not-exist'], // space-1 exists, it is mocked at the top
          },
        ],
      });

      changeSpaceSelection(['*']);
      expectButton('continue');
    });
  });
});
