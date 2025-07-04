/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../../../../../../mocks/test_provider';
import { ActionsProvider } from '../../../../state';
import { mockActions } from '../../../../mocks/state';
import { EndpointSelection } from './endpoint_selection';

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('EndpointSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when open with initial state', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <EndpointSelection
          allPaths={['/path1', '/path2', '/path3', '/path4']}
          pathSuggestions={['/path1', '/path2', '/path3']}
          selectedPath={'/path1'}
          selectedOtherPath={undefined}
          useOtherEndpoint={false}
          isGenerating={false}
          showValidation={false}
          onChangeSuggestedPath={() => {}}
          onChangeOtherPath={() => {}}
        />,
        { wrapper }
      );
    });

    it('should render endpoint selection radio group', () => {
      expect(result.queryByTestId('suggestedPathsRadioGroup')).toBeInTheDocument();
    });

    it('should render all path options combo box', () => {
      expect(result.queryByTestId('allPathOptionsComboBox')).toBeNull();
    });
  });

  describe('show all path options radio group', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <EndpointSelection
          allPaths={['/path1', '/path2', '/path3', '/path4']}
          pathSuggestions={['/path1', '/path2', '/path3']}
          selectedPath={'Enter Manually'}
          selectedOtherPath={undefined}
          useOtherEndpoint={true}
          isGenerating={false}
          showValidation={false}
          onChangeSuggestedPath={() => {}}
          onChangeOtherPath={() => {}}
        />,
        { wrapper }
      );
    });

    it('should render all path options combo box', () => {
      expect(result.queryByTestId('allPathOptionsComboBox')).toBeInTheDocument();
    });
  });

  describe('invalid auth & showing validation', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <EndpointSelection
          allPaths={['/path1', '/path2', '/path3', '/path4']}
          pathSuggestions={['/path1', '/path2', '/path3']}
          selectedPath={'Enter manually'}
          selectedOtherPath={undefined}
          useOtherEndpoint={true}
          isGenerating={false}
          showValidation={true}
          onChangeSuggestedPath={() => {}}
          onChangeOtherPath={() => {}}
        />,
        { wrapper }
      );
    });

    it('validation', () => {
      const otherEndpointSelection = result.getByTestId('allPathOptionsComboBox');
      expect(otherEndpointSelection).toHaveAttribute('aria-invalid');
    });
  });
});
