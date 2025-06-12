/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, type RenderResult, fireEvent } from '@testing-library/react';
import { TestProvider } from '../../../../../mocks/test_provider';
import { DataStreamStep, getNameFromTitle } from './data_stream_step';
import { ActionsProvider } from '../../state';
import { mockActions, mockState } from '../../mocks/state';

jest.mock('@elastic/eui', () => {
  return {
    ...jest.requireActual('@elastic/eui'),
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: { onChange: (options: unknown) => void; 'data-test-subj': string }) => (
      <input
        data-test-subj={props['data-test-subj']}
        onChange={(syntheticEvent) => {
          props.onChange([{ value: syntheticEvent.target.value }]);
        }}
      />
    ),
  };
});

jest.mock('./generation_modal', () => ({
  GenerationModal: jest.fn(() => <div data-test-subj="generationModal" />),
}));

const duplicatePackageName = 'valid_but_duplicate_package_name';
jest.mock('./use_load_package_names', () => {
  return {
    useLoadPackageNames: jest.fn(() => ({
      isLoading: false,
      packageNames: new Set([duplicatePackageName]),
    })),
  };
});

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('DataStreamStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when open with initial state', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <DataStreamStep
          integrationSettings={undefined}
          connector={mockState.connector}
          isGenerating={false}
          celInputResult={undefined}
        />,
        { wrapper }
      );
    });

    it('should render data stream step page', () => {
      expect(result.queryByTestId('dataStreamStep')).toBeInTheDocument();
    });

    describe('when package name changes', () => {
      let input: HTMLElement;
      beforeEach(() => {
        input = result.getByTestId('nameInput');
      });

      describe('with a valid name', () => {
        const name = 'valid_package_name_1';
        beforeEach(() => {
          act(() => {
            fireEvent.change(input, { target: { value: name } });
          });
        });

        it('should not render invalid input', () => {
          expect(input).not.toHaveAttribute('aria-invalid');
        });

        it('should call setIntegrationSettings', () => {
          expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({ name });
        });
      });

      describe('with an invalid name', () => {
        describe.each(['package name', 'package-name', 'packageName', 'package.name'])(
          'should render error for %s',
          (name) => {
            beforeEach(() => {
              act(() => {
                fireEvent.change(input, { target: { value: name } });
              });
            });
            it('should render invalid input', () => {
              expect(input).toHaveAttribute('aria-invalid');
            });
            it('should call setIntegrationSettings with undefined', () => {
              expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({
                name: undefined,
              });
            });
          }
        );
      });

      describe('with a duplicate name', () => {
        beforeEach(() => {
          act(() => {
            fireEvent.change(input, { target: { value: duplicatePackageName } });
          });
        });

        it('should render invalid input', () => {
          expect(input).toHaveAttribute('aria-invalid');
        });
        it('should call setIntegrationSettings with undefined', () => {
          expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({ name: undefined });
        });
      });
    });

    describe('when dataStreamTitle changes', () => {
      const dataStreamTitle = 'Data stream title';
      beforeEach(() => {
        act(() => {
          fireEvent.change(result.getByTestId('dataStreamTitleInput'), {
            target: { value: dataStreamTitle },
          });
        });
      });

      it('should call setIntegrationSettings', () => {
        expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({ dataStreamTitle });
      });
    });

    describe('when dataStreamDescription changes', () => {
      const dataStreamDescription = 'Data stream description';
      beforeEach(() => {
        act(() => {
          fireEvent.change(result.getByTestId('dataStreamDescriptionInput'), {
            target: { value: dataStreamDescription },
          });
        });
      });

      it('should call setIntegrationSettings', () => {
        expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({
          dataStreamDescription,
        });
      });
    });

    describe('when dataStreamName changes', () => {
      let input: HTMLElement;
      beforeEach(() => {
        input = result.getByTestId('dataStreamNameInput');
      });

      describe('with a valid name', () => {
        const dataStreamName = 'valid_data_stream_name_1';
        beforeEach(() => {
          act(() => {
            fireEvent.change(input, { target: { value: dataStreamName } });
          });
        });

        it('should not render invalid input', () => {
          expect(input).not.toHaveAttribute('aria-invalid');
        });

        it('should call setIntegrationSettings', () => {
          expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({ dataStreamName });
        });
      });

      describe('with an invalid name', () => {
        describe.each([
          'data stream name',
          'data-stream-name',
          'dataStreamName',
          'data.stream.name',
        ])('should render error for %s', (dataStreamName) => {
          beforeEach(() => {
            act(() => {
              fireEvent.change(input, { target: { value: dataStreamName } });
            });
          });
          it('should render invalid input', () => {
            expect(input).toHaveAttribute('aria-invalid');
          });
          it('should call setIntegrationSettings with undefined', () => {
            expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({ name: undefined });
          });
        });
      });
    });

    describe('when dataCollectionMethod changes', () => {
      const dataCollectionMethod = 'kafka';
      beforeEach(() => {
        act(() => {
          fireEvent.change(result.getByTestId('dataCollectionMethodInput'), {
            target: { value: dataCollectionMethod },
          });
        });
      });

      it('should call setIntegrationSettings', () => {
        expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({
          inputTypes: [dataCollectionMethod],
        });
      });
    });

    describe('when dataCollectionMethod is cel', () => {
      const dataCollectionMethod = 'cel';
      beforeEach(() => {
        act(() => {
          fireEvent.change(result.getByTestId('dataCollectionMethodInput'), {
            target: { value: dataCollectionMethod },
          });
        });
      });

      it('should show add OpenApi spec button', () => {
        expect(result.queryByTestId('addOpenApiSpecButton')).toBeInTheDocument();
      });
    });
  });

  describe('when dataCollectionMethod=cel and has celInputResult', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(
        <DataStreamStep
          integrationSettings={mockState.integrationSettings}
          connector={mockState.connector}
          isGenerating={false}
          celInputResult={mockState.celInputResult}
        />,
        { wrapper }
      );
      act(() => {
        fireEvent.change(result.getByTestId('dataCollectionMethodInput'), {
          target: { value: 'cel' },
        });
      });
    });

    it('should render successfully configured cel input', () => {
      expect(result.queryByTestId('openApiConfigured')).toBeInTheDocument();
    });
  });

  describe('when is generating', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(
        <DataStreamStep
          integrationSettings={mockState.integrationSettings}
          connector={mockState.connector}
          isGenerating={true}
          celInputResult={undefined}
        />,
        { wrapper }
      );
    });

    it('should render generation modal', () => {
      expect(result.queryByTestId('generationModal')).toBeInTheDocument();
    });
  });

  describe('when integrationSettings has an invalid generated name from title', () => {
    describe.each(['123 abc', '1a'])('should render error for %s', (invalidTitle) => {
      let result: RenderResult;
      beforeEach(() => {
        jest.clearAllMocks();
        result = render(
          <DataStreamStep
            integrationSettings={{ title: invalidTitle }}
            connector={mockState.connector}
            isGenerating={false}
            celInputResult={undefined}
          />,
          { wrapper }
        );
      });

      it('should set empty name for invalid title', () => {
        const input = result.getByTestId('nameInput');
        expect(input).toHaveValue(''); // name is not set
      });
    });
  });

  describe('when integrationSettings has an valid generated name from title', () => {
    describe.each(['abc 123', '$abc123', 'abc 123 abc', 'abc_123', 'abc_123_abc'])(
      'should render error for %s',
      (validTitle) => {
        let result: RenderResult;
        beforeEach(() => {
          jest.clearAllMocks();
          result = render(
            <DataStreamStep
              integrationSettings={{ title: validTitle }}
              connector={mockState.connector}
              isGenerating={false}
              celInputResult={undefined}
            />,
            { wrapper }
          );
        });

        it('should auto-generate name from title', () => {
          const input = result.getByTestId('nameInput');
          expect(input).toHaveValue(getNameFromTitle(validTitle));
          expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({
            name: getNameFromTitle(validTitle),
            title: validTitle,
          });
        });
      }
    );
  });
});
