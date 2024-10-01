/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, act } from '@testing-library/react';
import { EuiMarkdownFormat, copyToClipboard } from '@elastic/eui';
import userEvent from '@testing-library/user-event';

import { getLegacyHistoricalResultStub } from '../../../../../../../../stub/get_historical_result_stub';
import { LegacyHistoricalCheckFields } from '.';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../../../../../../../mock/test_providers/test_providers';
import {
  CHECK_IS_BASED_ON_LEGACY_FORMAT,
  DEPRECATED_DATA_FORMAT,
  TO_SEE_RUN_A_NEW_CHECK,
} from './translations';

jest.mock('@elastic/eui', () => {
  const originalModule = jest.requireActual('@elastic/eui');

  return {
    ...originalModule,
    copyToClipboard: jest.fn(),
  };
});

// This function is used to strip all attributes from an HTML string
// so that we can compare the rendered HTML without worrying about unstable attributes
// useful for crude markdown rendering comparison
function stripAttributes(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function removeAttributes(node: ChildNode) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (!(node instanceof Element)) throw new Error();
      while (node.attributes.length > 0) {
        node.removeAttribute(node.attributes[0].name);
      }
      node.childNodes.forEach(removeAttributes);
    }
  }

  removeAttributes(doc.body);
  return doc.body.innerHTML;
}

describe('LegacyHistoricalCheckFields', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('when no incompatible fields', () => {
    it('should just render success check prompt', () => {
      const historicalResult = {
        ...getLegacyHistoricalResultStub('test'),
        incompatibleFieldCount: 0,
      };
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <LegacyHistoricalCheckFields indexName="test" historicalResult={historicalResult} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByTestId('checkSuccessEmptyPrompt')).toBeInTheDocument();
    });
  });

  describe('when there are incompatible fields', () => {
    it('should render warning messages', () => {
      const historicalResult = getLegacyHistoricalResultStub('test');
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <LegacyHistoricalCheckFields indexName="test" historicalResult={historicalResult} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByText(DEPRECATED_DATA_FORMAT)).toBeInTheDocument();
      expect(screen.getByText(CHECK_IS_BASED_ON_LEGACY_FORMAT)).toBeInTheDocument();
      expect(screen.getByText(TO_SEE_RUN_A_NEW_CHECK)).toBeInTheDocument();
    });

    it('should render incompatible fields messages including ecs version and field count', () => {
      const historicalResult = getLegacyHistoricalResultStub('test');
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <LegacyHistoricalCheckFields indexName="test" historicalResult={historicalResult} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByTestId('incompatibleCallout')).toHaveTextContent(
        `${historicalResult.incompatibleFieldCount} incompatible field`
      );
      expect(screen.getByTestId('fieldsAreIncompatible')).toHaveTextContent(
        `Fields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${historicalResult.ecsVersion}.`
      );
    });

    it('should render eui formatted markdown from markdownComments table slice', () => {
      const historicalResult = getLegacyHistoricalResultStub('test');
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <LegacyHistoricalCheckFields indexName="test" historicalResult={historicalResult} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const tablesMarkdown = historicalResult.markdownComments.slice(4).join('\n');

      const wrapper = screen.getByTestId('incompatibleTablesMarkdown');

      const actualHTML = stripAttributes(wrapper.outerHTML);
      const expectedHTML = stripAttributes(
        render(
          <TestExternalProviders>
            <EuiMarkdownFormat>{tablesMarkdown}</EuiMarkdownFormat>
          </TestExternalProviders>
        ).container.innerHTML
      );

      expect(screen.getByTestId('incompatibleTablesMarkdown')).toBeInTheDocument();
      expect(actualHTML).toBe(expectedHTML);
    });

    it('should render full actions consuming full markdown comment', async () => {
      const historicalResult = getLegacyHistoricalResultStub('test');

      const openCreateCaseFlyout = jest.fn();
      const { markdownComments } = historicalResult;

      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            dataQualityContextProps={{
              openCreateCaseFlyout,
            }}
          >
            <LegacyHistoricalCheckFields indexName="test" historicalResult={historicalResult} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const wrapper = screen.getByTestId('actions');

      expect(wrapper).toBeInTheDocument();

      const addToNewCase = screen.getByLabelText('Add to new case');
      expect(addToNewCase).toBeInTheDocument();
      await act(async () => userEvent.click(addToNewCase));
      expect(openCreateCaseFlyout).toHaveBeenCalledWith({
        comments: [markdownComments.join('\n')],
        headerContent: expect.anything(),
      });

      const copyToClipboardElement = screen.getByLabelText('Copy to clipboard');
      expect(copyToClipboardElement).toBeInTheDocument();
      await act(async () => userEvent.click(copyToClipboardElement));
      expect(copyToClipboard).toHaveBeenCalledWith(markdownComments.join('\n'));

      const chat = screen.getByTestId('newChatLink');
      expect(chat).toBeInTheDocument();
      // clicking in test is broken atm
      // so can't test the chat action + markdown comment
    });
  });
});
