/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseSubActionParams } from '@kbn/triggers-actions-ui-plugin/public/application/hooks/use_sub_action';
import TinesParamsFields from './tines_params';
import { ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public/types';

const triggersActionsPath = '@kbn/triggers-actions-ui-plugin/public';
interface Result {
  isLoading: boolean;
  response: Record<string, unknown>;
  error: null | Error;
}
const mockUseSubActionStories = jest.fn<Result, [UseSubActionParams<unknown>]>(() => ({
  isLoading: false,
  response: { stories: [story], incompleteResponse: false },
  error: null,
}));
const mockUseSubActionWebhooks = jest.fn<Result, [UseSubActionParams<unknown>]>(() => ({
  isLoading: false,
  response: { webhooks: [webhook], incompleteResponse: false },
  error: null,
}));
const mockUseSubAction = jest.fn<Result, [UseSubActionParams<unknown>]>((params) =>
  params.subAction === 'stories'
    ? mockUseSubActionStories(params)
    : mockUseSubActionWebhooks(params)
);

const mockToasts = { addDanger: jest.fn(), addWarning: jest.fn() };
jest.mock(triggersActionsPath, () => {
  const original = jest.requireActual(triggersActionsPath);
  return {
    ...original,
    useSubAction: (params: UseSubActionParams<unknown>) => mockUseSubAction(params),
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        notifications: { toasts: mockToasts },
      },
    }),
  };
});

const mockEditAction = jest.fn();
const index = 0;
const webhook = {
  id: 1234,
  storyId: 5678,
  name: 'test webhook',
  path: 'somePath',
  secret: 'someSecret',
};
const story = { id: webhook.storyId, name: 'test story', published: false };
const actionParams = { subActionParams: { webhook } };
const emptyErrors = { subAction: [], subActionParams: [] };

describe('TinesParamsFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('New connector', () => {
    it('should render empty run form', () => {
      render(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );

      expect(screen.queryByTestId('tines-bodyJsonEditor')).not.toBeInTheDocument();

      const tinesStorySelector = screen.getByTestId('tines-storySelector');
      const tinesWebhookSelector = screen.getByTestId('tines-webhookSelector');
      expect(tinesStorySelector).toBeInTheDocument();
      expect(within(tinesStorySelector).getByRole('combobox')).toHaveAttribute(
        'placeholder',
        'Select a Tines story'
      );
      expect(tinesWebhookSelector).toBeInTheDocument();
      expect(within(tinesWebhookSelector).getByRole('combobox')).toHaveAttribute(
        'placeholder',
        'Select a story first'
      );
      expect(screen.queryByTestId('tines-fallbackCallout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tines-webhookUrlInput')).not.toBeInTheDocument();

      expect(mockEditAction).toHaveBeenCalledWith('subAction', 'run', index);
    });

    it('should render empty test form', () => {
      render(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.Test}
        />
      );

      expect(screen.getByTestId('tines-bodyJsonEditor')).toBeInTheDocument();
      expect(screen.getByTestId('bodyAddVariableButton')).toBeDisabled();

      const tinesStorySelector = screen.getByTestId('tines-storySelector');
      const tinesWebhookSelector = screen.getByTestId('tines-webhookSelector');
      expect(tinesStorySelector).toBeInTheDocument();
      expect(within(tinesStorySelector).getByRole('combobox')).toHaveAttribute(
        'placeholder',
        'Select a Tines story'
      );
      expect(tinesWebhookSelector).toBeInTheDocument();
      expect(within(tinesWebhookSelector).getByRole('combobox')).toHaveAttribute(
        'placeholder',
        'Select a story first'
      );

      expect(mockEditAction).toHaveBeenCalledWith('subAction', 'test', index);
    });

    it('should call useSubAction with empty form', () => {
      render(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );
      expect(mockUseSubAction).toHaveBeenCalledTimes(2);
      expect(mockUseSubActionStories).toHaveBeenCalledWith(
        expect.objectContaining({ subAction: 'stories' })
      );
      expect(mockUseSubActionWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({ subAction: 'webhooks', disabled: true })
      );
    });

    it('should render with story selectable and webhook selector disabled', async () => {
      render(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );
      const toggleButton = within(screen.getByTestId('tines-storySelector')).getByTestId(
        'comboBoxToggleListButton'
      );
      await userEvent.click(toggleButton);

      expect(screen.getByTestId(/tines-storySelector-optionsList/)).toBeInTheDocument();
      expect(screen.getByTestId(/tines-storySelector-optionsList/)).toHaveTextContent(story.name);
      expect(
        within(screen.getByTestId('tines-webhookSelector')).getByRole('combobox')
      ).toBeDisabled();
    });

    it('should render with a story option with Published badge', async () => {
      mockUseSubActionStories.mockReturnValueOnce({
        isLoading: false,
        response: { stories: [{ ...story, published: true }], incompleteResponse: false },
        error: null,
      });

      render(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );
      const toggleButton = within(screen.getByTestId('tines-storySelector')).getByTestId(
        'comboBoxToggleListButton'
      );
      await userEvent.click(toggleButton);

      expect(screen.getByTestId(/tines-storySelector-optionsList/)).toHaveTextContent('Published');
    });

    it('should enable with webhook selector when story selected', async () => {
      render(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );
      await userEvent.click(
        within(screen.getByTestId('tines-storySelector')).getByTestId('comboBoxToggleListButton')
      );
      const storyOption = within(
        screen.getByTestId(/tines-storySelector-optionsList/)
      ).getAllByRole('option')[0];
      await userEvent.click(storyOption);

      expect(
        within(screen.getByTestId('tines-webhookSelector')).getByRole('combobox')
      ).not.toBeDisabled();
      expect(
        within(screen.getByTestId('tines-webhookSelector')).getByRole('combobox')
      ).toHaveAttribute('placeholder', 'Select a webhook action');

      await userEvent.click(
        within(screen.getByTestId('tines-webhookSelector')).getByTestId('comboBoxToggleListButton')
      );

      expect(screen.getByTestId(/tines-webhookSelector-optionsList/)).toHaveTextContent(
        webhook.name
      );
    });

    it('should set form values when selected', async () => {
      render(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );

      await userEvent.click(
        within(screen.getByTestId('tines-storySelector')).getByTestId('comboBoxToggleListButton')
      );
      await userEvent.click(
        within(screen.getByTestId(/tines-storySelector-optionsList/)).getAllByRole('option')[0]
      );

      expect(mockEditAction).toHaveBeenCalledWith(
        'subActionParams',
        { webhook: { storyId: story.id } },
        index
      );

      await userEvent.click(
        within(screen.getByTestId('tines-webhookSelector')).getByTestId('comboBoxToggleListButton')
      );
      await userEvent.click(
        within(screen.getByTestId(/tines-webhookSelector-optionsList/)).getAllByRole('option')[0]
      );

      expect(mockEditAction).toHaveBeenCalledWith('subActionParams', { webhook }, index);
    });

    it('should render webhook url fallback when response incomplete', () => {
      mockUseSubActionStories.mockReturnValueOnce({
        isLoading: false,
        response: { stories: [story], incompleteResponse: true },
        error: null,
      });

      render(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );
      expect(screen.getByTestId('tines-fallbackCallout')).toBeInTheDocument();
      expect(screen.getByTestId('tines-webhookUrlInput')).toBeInTheDocument();
    });
  });

  describe('Edit connector', () => {
    it('should render form values', () => {
      render(
        <TinesParamsFields
          actionParams={actionParams}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );

      expect(screen.queryByTestId('tines-bodyJsonEditor')).not.toBeInTheDocument();
      expect(screen.getByTestId('tines-storySelector')).toBeInTheDocument();
      expect(within(screen.getByTestId('tines-storySelector')).getByRole('combobox')).toHaveValue(
        story.name
      );
      expect(screen.getByTestId('tines-webhookSelector')).toBeInTheDocument();
      expect(within(screen.getByTestId('tines-webhookSelector')).getByRole('combobox')).toHaveValue(
        webhook.name
      );

      expect(screen.queryByTestId('tines-fallbackCallout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tines-webhookUrlInput')).not.toBeInTheDocument();
    });

    it('should call useSubAction with form values', () => {
      render(
        <TinesParamsFields
          actionParams={actionParams}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );
      expect(mockUseSubActionStories).toHaveBeenCalledWith(
        expect.objectContaining({ subAction: 'stories' })
      );
      expect(mockUseSubActionWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({
          subAction: 'webhooks',
          subActionParams: { storyId: story.id },
        })
      );
    });

    it('should show warning if story not found', () => {
      render(
        <TinesParamsFields
          actionParams={{ subActionParams: { webhook: { ...webhook, storyId: story.id + 1 } } }}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );

      expect(mockToasts.addWarning).toHaveBeenCalledWith({
        title: 'Cannot find the saved story. Please select a valid story from the selector',
      });
    });

    it('should show warning if webhook not found', () => {
      render(
        <TinesParamsFields
          actionParams={{ subActionParams: { webhook: { ...webhook, id: webhook.id + 1 } } }}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );

      expect(mockToasts.addWarning).toHaveBeenCalledWith({
        title: 'Cannot find the saved webhook. Please select a valid webhook from the selector',
      });
    });

    describe('WebhookUrl fallback', () => {
      beforeEach(() => {
        mockUseSubActionStories.mockReturnValue({
          isLoading: false,
          response: { stories: [story], incompleteResponse: true },
          error: null,
        });

        mockUseSubActionWebhooks.mockReturnValue({
          isLoading: false,
          response: { webhooks: [webhook], incompleteResponse: true },
          error: null,
        });
      });

      it('should not render webhook url fallback when stories response incomplete but selected story found', () => {
        render(
          <TinesParamsFields
            actionParams={actionParams}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );
        expect(screen.queryByTestId('tines-fallbackCallout')).not.toBeInTheDocument();
        expect(screen.queryByTestId('tines-webhookUrlInput')).not.toBeInTheDocument();
      });

      it('should render webhook url fallback when stories response incomplete and selected story not found', () => {
        mockUseSubActionStories.mockReturnValue({
          isLoading: false,
          response: { stories: [], incompleteResponse: true },
          error: null,
        });

        render(
          <TinesParamsFields
            actionParams={actionParams}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );
        expect(screen.getByTestId('tines-fallbackCallout')).toBeInTheDocument();
        expect(screen.getByTestId('tines-webhookUrlInput')).toBeInTheDocument();
      });

      it('should not render webhook url fallback when webhook response incomplete but webhook selected found', () => {
        render(
          <TinesParamsFields
            actionParams={actionParams}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );
        expect(screen.queryByTestId('tines-fallbackCallout')).not.toBeInTheDocument();
        expect(screen.queryByTestId('tines-webhookUrlInput')).not.toBeInTheDocument();
      });

      it('should render webhook url fallback when webhook response incomplete and webhook selected not found', () => {
        mockUseSubActionWebhooks.mockReturnValue({
          isLoading: false,
          response: { webhooks: [], incompleteResponse: true },
          error: null,
        });

        render(
          <TinesParamsFields
            actionParams={actionParams}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );
        expect(screen.getByTestId('tines-fallbackCallout')).toBeInTheDocument();
        expect(screen.getByTestId('tines-webhookUrlInput')).toBeInTheDocument();
      });

      it('should render webhook url fallback without callout when responses are complete but webhookUrl is stored', () => {
        const webhookUrl = 'https://example.tines.com/1234';
        render(
          <TinesParamsFields
            actionParams={{ subActionParams: { ...actionParams.subActionParams, webhookUrl } }}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );
        expect(screen.queryByTestId('tines-fallbackCallout')).not.toBeInTheDocument();
        expect(screen.getByTestId('tines-webhookUrlInput')).toBeInTheDocument();
        expect(screen.getByTestId('tines-webhookUrlInput')).toHaveValue(webhookUrl);
      });

      it('should render webhook url fallback when stories request has error', () => {
        const errorMessage = 'something broke';
        mockUseSubActionStories.mockReturnValueOnce({
          isLoading: false,
          response: { stories: [story] },
          error: new Error(errorMessage),
        });

        render(
          <TinesParamsFields
            actionParams={{}}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );

        expect(screen.getByTestId('tines-fallbackCallout')).toBeInTheDocument();
        expect(screen.getByTestId('tines-webhookUrlInput')).toBeInTheDocument();
      });

      it('should render webhook url fallback when webhooks request has error', () => {
        const errorMessage = 'something broke';
        mockUseSubActionWebhooks.mockReturnValueOnce({
          isLoading: false,
          response: { webhooks: [webhook] },
          error: new Error(errorMessage),
        });

        render(
          <TinesParamsFields
            actionParams={{}}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );

        expect(screen.getByTestId('tines-fallbackCallout')).toBeInTheDocument();
        expect(screen.getByTestId('tines-webhookUrlInput')).toBeInTheDocument();
      });
    });

    describe('subActions error', () => {
      it('should show error when stories subAction has error', () => {
        const errorMessage = 'something broke';
        mockUseSubActionStories.mockReturnValueOnce({
          isLoading: false,
          response: { stories: [story] },
          error: new Error(errorMessage),
        });

        render(
          <TinesParamsFields
            actionParams={{}}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );

        expect(mockToasts.addDanger).toHaveBeenCalledWith({
          title: 'Error retrieving stories from Tines',
          text: errorMessage,
        });
      });

      it('should show error when webhooks subAction has error', () => {
        const errorMessage = 'something broke';
        mockUseSubActionWebhooks.mockReturnValueOnce({
          isLoading: false,
          response: { webhooks: [webhook] },
          error: new Error(errorMessage),
        });

        render(
          <TinesParamsFields
            actionParams={{}}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );

        expect(mockToasts.addDanger).toHaveBeenCalledWith({
          title: 'Error retrieving webhook actions from Tines',
          text: errorMessage,
        });
      });
    });
  });
});
