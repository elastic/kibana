/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MATCHER_CONTEXT_FIELDS } from '@kbn/alerting-v2-schemas';
import { MatcherInput } from './matcher_input';

const ControlledMatcherInput = (
  props: Partial<React.ComponentProps<typeof MatcherInput>> & { initialValue?: string }
) => {
  const { initialValue = '', onChange: onChangeSpy, ...rest } = props;
  const [value, setValue] = useState(initialValue);
  return (
    <MatcherInput
      value={value}
      onChange={(v) => {
        setValue(v);
        onChangeSpy?.(v);
      }}
      data-test-subj="matcherInput"
      fullWidth
      {...rest}
    />
  );
};

const getInput = () => screen.getByTestId('matcherInput') as HTMLInputElement;

const getSuggestionsPanel = () => screen.queryByTestId('matcherSuggestionsPanel');

const getSuggestionItems = () => screen.queryAllByTestId(/^matcherSuggestion-/);

const getSuggestionByLabel = (label: string) => screen.queryByTestId(`matcherSuggestion-${label}`);

const typeInInput = async (text: string) => {
  const user = userEvent.setup();
  await user.type(getInput(), text);
};

const pressKey = (key: string) => {
  fireEvent.keyDown(getInput(), { key });
};

describe('MatcherInput', () => {
  describe('rendering', () => {
    it('renders the text input with the given placeholder', () => {
      render(<ControlledMatcherInput placeholder="Type a KQL expression" />);
      expect(getInput()).toHaveAttribute('placeholder', 'Type a KQL expression');
    });

    it('renders with the initial value', () => {
      render(<ControlledMatcherInput initialValue="episode_status" />);
      expect(getInput()).toHaveValue('episode_status');
    });

    it('does not show suggestions on initial render', () => {
      render(<ControlledMatcherInput />);
      expect(getSuggestionsPanel()).not.toBeInTheDocument();
    });
  });

  describe('showing suggestions', () => {
    it('shows matching suggestions when typing a field prefix', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('ep');

      expect(getSuggestionsPanel()).toBeInTheDocument();
      expect(getSuggestionByLabel('episode_id')).toBeInTheDocument();
      expect(getSuggestionByLabel('episode_status')).toBeInTheDocument();
      expect(getSuggestionByLabel('rule_id')).not.toBeInTheDocument();
    });

    it('shows nested rule fields when typing "rule."', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('rule.');

      expect(getSuggestionsPanel()).toBeInTheDocument();
      expect(getSuggestionByLabel('rule.id')).toBeInTheDocument();
      expect(getSuggestionByLabel('rule.name')).toBeInTheDocument();
      expect(getSuggestionByLabel('rule.labels')).toBeInTheDocument();
    });

    it('shows all fields starting with "r"', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('r');

      const allRuleFields = MATCHER_CONTEXT_FIELDS.filter((f) => f.path.startsWith('r'));
      expect(getSuggestionItems()).toHaveLength(allRuleFields.length);
    });

    it('is case-insensitive', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('EP');

      expect(getSuggestionByLabel('episode_id')).toBeInTheDocument();
      expect(getSuggestionByLabel('episode_status')).toBeInTheDocument();
    });

    it('hides suggestions when no fields match', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('zzz');

      expect(getSuggestionsPanel()).not.toBeInTheDocument();
    });

    it('shows suggestions for a token after a colon and space', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('episode_id : "foo" and ep');

      expect(getSuggestionByLabel('episode_id')).toBeInTheDocument();
      expect(getSuggestionByLabel('episode_status')).toBeInTheDocument();
    });

    it('displays field type badge and description in each suggestion', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('rule.lab');

      const suggestion = getSuggestionByLabel('rule.labels')!;
      expect(suggestion).toBeInTheDocument();
      expect(within(suggestion).getByText('rule.labels')).toBeInTheDocument();
      expect(within(suggestion).getByText('string[]')).toBeInTheDocument();
      expect(within(suggestion).getByText('Rule labels')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('selects next suggestion with ArrowDown', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('ep');

      const items = getSuggestionItems();
      expect(items[0]).toHaveAttribute('aria-selected', 'true');
      expect(items[1]).toHaveAttribute('aria-selected', 'false');

      pressKey('ArrowDown');

      const updated = getSuggestionItems();
      expect(updated[0]).toHaveAttribute('aria-selected', 'false');
      expect(updated[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('selects previous suggestion with ArrowUp', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('ep');

      pressKey('ArrowDown');
      expect(getSuggestionItems()[1]).toHaveAttribute('aria-selected', 'true');

      pressKey('ArrowUp');
      expect(getSuggestionItems()[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('wraps around when navigating past the last suggestion', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('ep');

      const count = getSuggestionItems().length;
      for (let i = 0; i < count; i++) {
        pressKey('ArrowDown');
      }

      expect(getSuggestionItems()[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('applies the selected suggestion on Enter', async () => {
      const onChange = jest.fn();
      render(<ControlledMatcherInput onChange={onChange} />);
      await typeInInput('ep');

      pressKey('ArrowDown');
      pressKey('Enter');

      expect(onChange).toHaveBeenCalledWith('episode_status');
    });

    it('applies the first suggestion on Tab', async () => {
      const onChange = jest.fn();
      render(<ControlledMatcherInput onChange={onChange} />);
      await typeInInput('ep');

      pressKey('Tab');

      expect(onChange).toHaveBeenCalledWith('episode_id');
    });

    it('closes suggestions on Escape', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('ep');
      expect(getSuggestionsPanel()).toBeInTheDocument();

      pressKey('Escape');

      await waitFor(() => {
        expect(getSuggestionsPanel()).not.toBeInTheDocument();
      });
    });
  });

  describe('selecting a suggestion via click', () => {
    it('replaces the current token when clicking a suggestion', async () => {
      const onChange = jest.fn();
      render(<ControlledMatcherInput onChange={onChange} />);
      await typeInInput('ep');

      fireEvent.mouseDown(getSuggestionByLabel('episode_status')!);

      expect(onChange).toHaveBeenCalledWith('episode_status');
    });

    it('replaces only the active token in a multi-token expression', async () => {
      const onChange = jest.fn();
      render(<ControlledMatcherInput />);
      await typeInInput('episode_id : "foo" and ru');

      fireEvent.mouseDown(getSuggestionByLabel('rule.name')!);

      expect(getInput()).toHaveValue('episode_id : "foo" and rule.name');
    });

    it('closes the popover after selecting a suggestion', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('ep');
      expect(getSuggestionsPanel()).toBeInTheDocument();

      fireEvent.mouseDown(getSuggestionByLabel('episode_id')!);

      await waitFor(() => {
        expect(getSuggestionsPanel()).not.toBeInTheDocument();
      });
    });
  });

  describe('value suggestions', () => {
    it('shows value suggestions after "episode_status : "', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('episode_status : ');

      expect(getSuggestionsPanel()).toBeInTheDocument();
      expect(getSuggestionByLabel('"inactive"')).toBeInTheDocument();
      expect(getSuggestionByLabel('"pending"')).toBeInTheDocument();
      expect(getSuggestionByLabel('"active"')).toBeInTheDocument();
      expect(getSuggestionByLabel('"recovering"')).toBeInTheDocument();
    });

    it('shows boolean value suggestions without quotes for rule.enabled', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('rule.enabled : ');

      expect(getSuggestionsPanel()).toBeInTheDocument();
      expect(getSuggestionByLabel('true')).toBeInTheDocument();
      expect(getSuggestionByLabel('false')).toBeInTheDocument();
    });

    it('does not show value suggestions for fields without known values', async () => {
      render(<ControlledMatcherInput />);
      await typeInInput('episode_id : ');

      expect(getSuggestionByLabel('"inactive"')).not.toBeInTheDocument();
      expect(getSuggestionByLabel('"active"')).not.toBeInTheDocument();
    });

    it('inserts the selected value into the expression', async () => {
      const onChange = jest.fn();
      render(<ControlledMatcherInput onChange={onChange} />);
      await typeInInput('episode_status : ');

      fireEvent.mouseDown(getSuggestionByLabel('"active"')!);

      expect(onChange).toHaveBeenCalledWith('episode_status : "active"');
    });

    it('inserts boolean value without quotes', async () => {
      const onChange = jest.fn();
      render(<ControlledMatcherInput onChange={onChange} />);
      await typeInInput('rule.enabled : ');

      fireEvent.mouseDown(getSuggestionByLabel('true')!);

      expect(onChange).toHaveBeenCalledWith('rule.enabled : true');
    });
  });

  describe('onChange callback', () => {
    it('calls onChange on typing', async () => {
      const onChange = jest.fn();
      render(<ControlledMatcherInput onChange={onChange} />);
      await typeInInput('abc');

      expect(onChange).toHaveBeenCalled();
      expect(getInput()).toHaveValue('abc');
    });
  });
});
