/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILLEGAL_CHARACTERS_VISIBLE } from '@kbn/data-views-plugin/public';
import { fireEvent, screen, within, act } from '@testing-library/react';
import './mocks';
import { setupEnvironment, pageHelpers, getRandomString } from './helpers';

const { setup } = pageHelpers.autoFollowPatternAdd;

describe('Create Auto-follow pattern', () => {
  let httpRequestsMockHelpers;
  let httpSetup;
  let user;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
    httpRequestsMockHelpers.setLoadRemoteClustersResponse([]);
  });

  describe('on component mount', () => {
    beforeEach(() => {
      // Override HTTP mocks to return never-resolving promises
      // This keeps the component in LOADING state without triggering act warnings
      httpSetup.get.mockImplementation(() => new Promise(() => {}));

      ({ user } = setup());
    });

    test('should display a "loading remote clusters" indicator', () => {
      expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
      expect(screen.getByTestId('sectionLoading').textContent).toBe('Loading remote clusters…');
    });
  });

  describe('when remote clusters are loaded', () => {
    beforeEach(async () => {
      ({ user } = setup());
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should have a link to the documentation', () => {
      expect(screen.getByTestId('docsButton')).toBeInTheDocument();
    });

    test('should display the Auto-follow pattern form', () => {
      expect(screen.getByTestId('autoFollowPatternForm')).toBeInTheDocument();
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', async () => {
      expect(screen.queryByTestId('formError')).not.toBeInTheDocument();
      expect(screen.getByTestId('submitButton')).not.toBeDisabled();

      const saveButton = screen.getByTestId('submitButton');
      await user.click(saveButton);

      expect(screen.getByTestId('formError')).toBeInTheDocument();
      const errors = screen.queryAllByText(
        /Name is required|At least one leader index pattern is required/
      );
      expect(errors.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByTestId('submitButton')).toBeDisabled();
    });
  });

  describe('form validation', () => {
    describe('auto-follow pattern name', () => {
      beforeEach(async () => {
        ({ user } = setup());
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
      });

      test('should not allow spaces', () => {
        const nameInput = screen.getByTestId('nameInput');
        fireEvent.change(nameInput, { target: { value: 'with space' } });
        fireEvent.blur(nameInput);

        const saveButton = screen.getByTestId('submitButton');
        fireEvent.click(saveButton);

        expect(screen.getByText('Spaces are not allowed in the name.')).toBeInTheDocument();
      });

      test('should not allow a "_" (underscore) as first character', () => {
        const nameInput = screen.getByTestId('nameInput');
        fireEvent.change(nameInput, { target: { value: '_withUnderscore' } });
        fireEvent.blur(nameInput);

        const saveButton = screen.getByTestId('submitButton');
        fireEvent.click(saveButton);

        expect(screen.getByText(`Name can't begin with an underscore.`)).toBeInTheDocument();
      });

      test('should not allow a "," (comma)', () => {
        const nameInput = screen.getByTestId('nameInput');
        fireEvent.change(nameInput, { target: { value: 'with,coma' } });
        fireEvent.blur(nameInput);

        const saveButton = screen.getByTestId('submitButton');
        fireEvent.click(saveButton);

        expect(screen.getByText(`Commas are not allowed in the name.`)).toBeInTheDocument();
      });
    });

    describe('remote clusters', () => {
      describe('when no remote clusters were found', () => {
        test('should indicate it and have a button to add one', async () => {
          ({ user } = setup());

          const noClusterError = await screen.findByTestId('noClusterFoundError');
          expect(noClusterError).toBeInTheDocument();

          const addButton = within(screen.getByTestId('remoteClusterFormField')).getByTestId(
            'addButton'
          );
          expect(addButton).toBeInTheDocument();
        });
      });

      describe('when there was an error loading the remote clusters', () => {
        test('should indicate no clusters found and have a button to add one', async () => {
          httpRequestsMockHelpers.setLoadRemoteClustersResponse(undefined, {
            body: 'Houston we got a problem',
          });

          ({ user } = setup());

          const noClusterError = await screen.findByTestId('noClusterFoundError');
          expect(noClusterError).toBeInTheDocument();

          const addButton = within(screen.getByTestId('remoteClusterFormField')).getByTestId(
            'addButton'
          );
          expect(addButton).toBeInTheDocument();
        });
      });

      describe('when none of the remote clusters is connected', () => {
        const clusterName = 'new-york';
        const remoteClusters = [
          {
            name: clusterName,
            seeds: ['localhost:9600'],
            isConnected: false,
          },
        ];

        beforeEach(async () => {
          httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);
          ({ user } = setup());
          await act(async () => {
            await jest.runOnlyPendingTimersAsync();
          });
        });

        test('should show a callout warning and have a button to edit the cluster', () => {
          const errorCallOut = screen.getByTestId('notConnectedError');
          const title = errorCallOut.querySelector('.euiCallOutHeader__title');

          expect(title.textContent).toBe(`Remote cluster '${clusterName}' is not connected`);

          const editButton = within(errorCallOut).getByTestId('editButton');
          expect(editButton).toBeInTheDocument();
        });

        test('should have a button to add another remote cluster', () => {
          const addButton = within(screen.getByTestId('remoteClusterFormField')).getByTestId(
            'addButton'
          );
          expect(addButton).toBeInTheDocument();
        });

        test('should indicate in the select option that the cluster is not connected', () => {
          const select = screen.getByTestId('remoteClusterSelect');
          const option = select.querySelector('option');
          expect(option.textContent).toBe(`${clusterName} (not connected)`);
        });
      });
    });

    describe('index patterns', () => {
      beforeEach(async () => {
        // Set up connected remote clusters so form renders
        httpRequestsMockHelpers.setLoadRemoteClustersResponse([
          { name: 'cluster-1', isConnected: true },
        ]);
        ({ user } = setup());
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
      });

      test('should not allow spaces', () => {
        const comboboxWrapper = screen.getByTestId('indexPatternInput');
        const input =
          comboboxWrapper.querySelector('[role="combobox"]') ||
          comboboxWrapper.querySelector('input');
        fireEvent.change(input, { target: { value: 'with space' } });
        fireEvent.blur(input);

        expect(
          screen.getByText('Spaces are not allowed in the index pattern.')
        ).toBeInTheDocument();
      });

      test.each(ILLEGAL_CHARACTERS_VISIBLE)(
        'should not allow invalid character %s',
        (illegalChar) => {
          const comboboxWrapper = screen.getByTestId('indexPatternInput');
          const input =
            comboboxWrapper.querySelector('[role="combobox"]') ||
            comboboxWrapper.querySelector('input');

          fireEvent.change(input, { target: { value: `legalchar` } });
          fireEvent.blur(input);

          expect(screen.queryByText(/Remove the character/)).not.toBeInTheDocument();

          // Test a few representative illegal characters
          fireEvent.change(input, { target: { value: `${illegalChar}char` } });
          fireEvent.blur(input);

          expect(screen.getByText(/Remove the character/m)).toBeInTheDocument();
        }
      );
    });
  });

  describe('generated indices preview', () => {
    beforeEach(async () => {
      ({ user } = setup());
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should display a preview of the possible indices generated by the auto-follow pattern', async () => {
      expect(screen.queryByTestId('autoFollowPatternIndicesPreview')).not.toBeInTheDocument();

      // The combobox should already be rendered after beforeEach timer advancement
      const comboboxWrapper = screen.getByTestId('indexPatternInput');
      const input =
        comboboxWrapper.querySelector('[role="combobox"]') ||
        comboboxWrapper.querySelector('input');
      fireEvent.change(input, { target: { value: 'kibana' } });
      fireEvent.blur(input);

      expect(screen.getByTestId('autoFollowPatternIndicesPreview')).toBeInTheDocument();
    });

    test('should display 3 indices example when providing a wildcard(*)', () => {
      const comboboxWrapper = screen.getByTestId('indexPatternInput');
      const input =
        comboboxWrapper.querySelector('[role="combobox"]') ||
        comboboxWrapper.querySelector('input');
      fireEvent.change(input, { target: { value: 'kibana-*' } });
      fireEvent.blur(input);

      const preview = screen.getByTestId('autoFollowPatternIndicesPreview');
      const indices = within(preview).queryAllByTestId('indexPreview');
      expect(indices.length).toBe(3);
      expect(indices[0].textContent).toContain('kibana-');
    });

    test('should only display 1 index example when *not* providing a wildcard', () => {
      const comboboxWrapper = screen.getByTestId('indexPatternInput');
      const input =
        comboboxWrapper.querySelector('[role="combobox"]') ||
        comboboxWrapper.querySelector('input');
      fireEvent.change(input, { target: { value: 'kibana' } });
      fireEvent.blur(input);

      const preview = screen.getByTestId('autoFollowPatternIndicesPreview');
      const indices = within(preview).queryAllByTestId('indexPreview');
      expect(indices.length).toBe(1);
      expect(indices[0].textContent).toEqual('kibana');
    });

    test('should add the prefix and the suffix to the preview', async () => {
      const prefix = getRandomString();
      const suffix = getRandomString();

      const comboboxWrapper = screen.getByTestId('indexPatternInput');
      const input =
        comboboxWrapper.querySelector('[role="combobox"]') ||
        comboboxWrapper.querySelector('input');
      fireEvent.change(input, { target: { value: 'kibana' } });
      fireEvent.blur(input);

      const prefixInput = screen.getByTestId('prefixInput');
      fireEvent.change(prefixInput, { target: { value: prefix } });
      fireEvent.blur(prefixInput);

      const suffixInput = screen.getByTestId('suffixInput');
      fireEvent.change(suffixInput, { target: { value: suffix } });
      fireEvent.blur(suffixInput);

      const { textContent: textPreview } = screen.getByTestId('indexPreview');

      expect(textPreview).toContain(prefix);
      expect(textPreview).toContain(suffix);
    });
  });
});
