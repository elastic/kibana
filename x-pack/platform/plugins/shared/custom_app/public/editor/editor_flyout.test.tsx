/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import { EditorFlyout } from './editor_flyout';

jest.mock('@kbn/esql/public', () => jest.requireActual('./fields/esql_editor.mock'));

const initialDocument = (): AppDocument =>
  appDocumentSchema.parse({
    state: { service: { type: 'string', default: 'checkout' } },
    root: {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'heading', id: 'title', text: 'Service health' },
        { type: 'stat', id: 'users-stat', title: 'Active users', query: 'ROW users = 1284' },
      ],
    },
  });

const setup = ({ withChat = false } = {}) => {
  const onSave = jest.fn();
  const onCancel = jest.fn();
  const onPreview = jest.fn();
  const onGenerateWithChat = jest.fn();
  render(
    <EditorFlyout
      initialDocument={initialDocument()}
      onPreview={onPreview}
      onGenerateWithChat={withChat ? onGenerateWithChat : undefined}
      onSave={onSave}
      onCancel={onCancel}
      ariaLabelledBy="editor-title"
    />
  );
  return { onSave, onCancel, onPreview, onGenerateWithChat };
};

const outline = (id: string) => screen.getByTestId(`customAppOutline-${id}`);
const properties = () => within(screen.getByTestId('customAppProperties'));

describe('EditorFlyout on a shared app', () => {
  const setupShared = (isShared?: boolean) =>
    render(
      <EditorFlyout
        initialDocument={appDocumentSchema.parse({
          root: { type: 'stack', id: 'root', children: [] },
        })}
        onPreview={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        ariaLabelledBy="editor-title"
        isShared={isShared}
      />
    );

  it('says that applying changes the app for every dashboard that uses it', () => {
    setupShared(true);

    const notice = screen.getByTestId('customAppEditorShared');
    expect(notice).toHaveTextContent('This app is shared');
    expect(notice).toHaveTextContent('every dashboard that uses this app');
  });

  it("says nothing of the kind for an app that is only the panel's own", () => {
    setupShared(false);

    expect(screen.queryByTestId('customAppEditorShared')).not.toBeInTheDocument();
  });

  it('says nothing of the kind unless it is told', () => {
    setupShared();

    expect(screen.queryByTestId('customAppEditorShared')).not.toBeInTheDocument();
  });
});

describe('EditorFlyout on an empty app', () => {
  const setupEmpty = () => {
    const onSave = jest.fn();
    render(
      <EditorFlyout
        initialDocument={appDocumentSchema.parse({
          root: { type: 'stack', id: 'root', children: [] },
        })}
        onPreview={jest.fn()}
        onSave={onSave}
        onCancel={jest.fn()}
        ariaLabelledBy="editor-title"
      />
    );
    return { onSave };
  };

  it('opens on the root alone, ready for the first component', () => {
    setupEmpty();

    expect(
      within(screen.getByRole('list', { name: 'Components' })).getAllByRole('button')
    ).toHaveLength(1);
    expect(screen.getByTestId('customAppOutline-root')).toHaveAttribute('aria-current', 'true');
  });

  it('cannot be saved while nothing has changed, and can once a component is added', async () => {
    const { onSave } = setupEmpty();
    expect(screen.getByRole('button', { name: /apply and close/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(screen.getByRole('button', { name: 'Text' }));
    await userEvent.click(screen.getByRole('button', { name: /apply and close/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        root: expect.objectContaining({ children: [expect.objectContaining({ type: 'text' })] }),
      })
    );
  });
});

describe('EditorFlyout', () => {
  it('opens with the outline of the app and the properties of its root', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Edit custom app' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Components' })).getAllByRole('button')
    ).toHaveLength(3);
    expect(properties().getByRole('heading', { name: 'Stack' })).toBeInTheDocument();
  });

  it('shows the properties of the component picked in the outline, and edits show in the outline', async () => {
    setup();

    await userEvent.click(outline('title'));
    expect(properties().getByRole('heading', { name: 'Heading' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Text'), '!');

    expect(within(outline('title')).getByText('Service health!')).toBeInTheDocument();
  });

  it('adds a component, which appears in the outline and is selected', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(screen.getByRole('button', { name: 'Callout' }));

    expect(outline('callout-1')).toHaveAttribute('aria-current', 'true');
    expect(properties().getByRole('heading', { name: 'Callout' })).toBeInTheDocument();
  });

  it("adds a time range, which can be placed with the filters, and is the app's only one", async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(screen.getByRole('button', { name: 'Time range' }));

    expect(outline('time_range-1')).toHaveAttribute('aria-current', 'true');
    expect(properties().getByRole('heading', { name: 'Time range' })).toBeInTheDocument();
  });

  it('deletes the selected component, and selects what held it', async () => {
    setup();
    await userEvent.click(outline('title'));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.queryByTestId('customAppOutline-title')).not.toBeInTheDocument();
    expect(outline('root')).toHaveAttribute('aria-current', 'true');
  });

  describe('undo and redo', () => {
    it('are unavailable until something changes, then step through the edits', async () => {
      setup();
      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: 'Add' }));
      await userEvent.click(screen.getByRole('button', { name: 'Text' }));
      expect(screen.getByTestId('customAppOutline-text-1')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(screen.queryByTestId('customAppOutline-text-1')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();

      await userEvent.click(screen.getByRole('button', { name: 'Redo' }));
      expect(screen.getByTestId('customAppOutline-text-1')).toBeInTheDocument();
    });
  });

  describe('problems', () => {
    it('lets the author apply a valid document once something has changed, and nothing else', async () => {
      const { onSave } = setup();
      await userEvent.click(outline('title'));
      await userEvent.type(screen.getByLabelText('Text'), '!');

      expect(screen.queryByTestId('customAppIssues')).not.toBeInTheDocument();
      await userEvent.click(screen.getByTestId('customAppEditorSave'));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(appDocumentSchema.safeParse(onSave.mock.calls[0][0]).success).toBe(true);
    });

    /** Empties the query of the stat, which leaves it with nothing to run. */
    const emptyTheStatQuery = async () => {
      await userEvent.click(outline('users-stat'));
      await userEvent.clear(screen.getByLabelText('ES|QL query editor'));
    };

    it('counts problems, blocks saving, and takes the author to the component that has one', async () => {
      const { onSave } = setup();
      await emptyTheStatQuery();
      // Moves away from the component, so that being taken back to it shows.
      await userEvent.click(outline('title'));

      expect(screen.getByTestId('customAppIssues')).toHaveTextContent('1 problem');
      expect(screen.getByTestId('customAppEditorSave')).toBeDisabled();

      await userEvent.click(screen.getByTestId('customAppIssues'));
      // The panel ignores the pointer while it animates open.
      const panel = await screen.findByLabelText('Problems to fix before saving');
      await waitFor(() => expect(window.getComputedStyle(panel).pointerEvents).not.toBe('none'));
      await userEvent.click(screen.getByText(/^Node "users-stat", query: /));

      expect(outline('users-stat')).toHaveAttribute('aria-current', 'true');
      expect(properties().getByText('This component needs attention')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('marks the component that has a problem in the outline', async () => {
      setup();

      await emptyTheStatQuery();

      expect(within(outline('users-stat')).getByTitle('Needs attention')).toBeInTheDocument();
    });

    it('lets the problem be fixed by writing the query', async () => {
      setup();
      await emptyTheStatQuery();
      expect(screen.getByTestId('customAppEditorSave')).toBeDisabled();

      await userEvent.type(screen.getByLabelText('ES|QL query editor'), 'ROW users = 1');

      expect(screen.queryByTestId('customAppIssues')).not.toBeInTheDocument();
      expect(screen.getByTestId('customAppEditorSave')).toBeEnabled();
    });

    it('edits the query of one component without touching another', async () => {
      setup();
      await userEvent.click(screen.getByRole('button', { name: 'Add' }));
      await userEvent.click(screen.getByRole('button', { name: 'Table' }));
      expect(screen.getByLabelText('ES|QL query editor')).toHaveValue('ROW value = 1');

      await userEvent.type(screen.getByLabelText('ES|QL query editor'), ' | LIMIT 5');
      await userEvent.click(outline('users-stat'));

      expect(screen.getByLabelText('ES|QL query editor')).toHaveValue('ROW users = 1284');
    });
  });

  describe('layout', () => {
    it('shows the properties of the selected component and nothing to switch between', () => {
      setup();

      expect(screen.queryAllByRole('tab')).toEqual([]);
      expect(properties().getByRole('heading', { name: 'Stack' })).toBeInTheDocument();
    });

    it('does not show the stored document: that is on the panel menu, for debugging', () => {
      setup();

      expect(screen.queryByText(/"root"/)).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Source' })).not.toBeInTheDocument();
    });
  });

  describe('cancelling', () => {
    it('closes at once when nothing was changed', async () => {
      const { onCancel } = setup();

      await userEvent.click(screen.getByTestId('customAppEditorCancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Discard your changes?')).not.toBeInTheDocument();
    });

    it('asks first when there are changes, and carries on editing if the author says so', async () => {
      const { onCancel } = setup();
      await userEvent.click(outline('title'));
      await userEvent.type(screen.getByLabelText('Text'), '!');

      await userEvent.click(screen.getByTestId('customAppEditorCancel'));
      expect(screen.getByText('Discard your changes?')).toBeInTheDocument();
      expect(onCancel).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
      expect(screen.queryByText('Discard your changes?')).not.toBeInTheDocument();
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('closes once the author agrees to discard', async () => {
      const { onCancel } = setup();
      await userEvent.click(outline('title'));
      await userEvent.type(screen.getByLabelText('Text'), '!');

      await userEvent.click(screen.getByTestId('customAppEditorCancel'));
      await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not ask when the changes were all undone', async () => {
      const { onCancel } = setup();
      await userEvent.click(screen.getByRole('button', { name: 'Add' }));
      await userEvent.click(screen.getByRole('button', { name: 'Text' }));
      await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

      await userEvent.click(screen.getByTestId('customAppEditorCancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('previewing, as in custom content', () => {
    it('has a green Run preview button with a play icon, that never changes its name', async () => {
      setup();

      expect(screen.getByTestId('customAppEditorPreview')).toHaveTextContent('Run preview');
      await userEvent.click(outline('title'));
      await userEvent.type(screen.getByLabelText('Text'), '!');
      expect(screen.getByTestId('customAppEditorPreview')).toHaveTextContent('Run preview');
    });

    it('shows the draft on the panel when it is run, and nothing before', async () => {
      const { onPreview } = setup();
      expect(onPreview).not.toHaveBeenCalled();

      await userEvent.click(screen.getByTestId('customAppEditorPreview'));

      expect(onPreview).toHaveBeenCalledTimes(1);
      expect(onPreview.mock.calls[0][0]).toEqual(initialDocument());
    });

    it('shows the draft as it is each time it is run', async () => {
      const { onPreview } = setup();
      await userEvent.click(screen.getByTestId('customAppEditorPreview'));
      await userEvent.click(outline('title'));
      await userEvent.type(screen.getByLabelText('Text'), '!');

      await userEvent.click(screen.getByTestId('customAppEditorPreview'));

      expect(onPreview).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(onPreview.mock.calls[1][0])).toContain('Service health!');
    });

    it('can run a draft that has problems, to see what they look like', async () => {
      const { onPreview } = setup();
      await userEvent.click(outline('users-stat'));
      await userEvent.clear(screen.getByLabelText('ES|QL query editor'));
      expect(screen.getByTestId('customAppEditorSave')).toBeDisabled();

      await userEvent.click(screen.getByTestId('customAppEditorPreview'));

      expect(onPreview).toHaveBeenCalledTimes(1);
    });
  });

  describe('applying', () => {
    it('is named Apply and close, and is not available until something has changed', async () => {
      setup();

      expect(screen.getByTestId('customAppEditorSave')).toHaveTextContent('Apply and close');
      expect(screen.getByTestId('customAppEditorSave')).toBeDisabled();

      await userEvent.click(outline('title'));
      await userEvent.type(screen.getByLabelText('Text'), '!');

      expect(screen.getByTestId('customAppEditorSave')).toBeEnabled();
    });

    it('is not available again once the changes are all undone', async () => {
      setup();
      await userEvent.click(screen.getByRole('button', { name: 'Add' }));
      await userEvent.click(screen.getByRole('button', { name: 'Text' }));
      expect(screen.getByTestId('customAppEditorSave')).toBeEnabled();

      await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

      expect(screen.getByTestId('customAppEditorSave')).toBeDisabled();
    });

    it('is not available while there are problems, even with changes', async () => {
      setup();
      await userEvent.click(outline('users-stat'));
      await userEvent.clear(screen.getByLabelText('ES|QL query editor'));

      expect(screen.getByTestId('customAppEditorSave')).toBeDisabled();
    });
  });

  describe('look', () => {
    it('describes what it is for under the title, as custom content does', () => {
      setup();

      expect(
        screen.getByText('Build an app from components, each driven by its own ES|QL query.')
      ).toBeInTheDocument();
    });

    it('has Cancel at the start of the footer, and the preview and apply buttons together at the end', () => {
      setup();
      const buttons = [
        screen.getByTestId('customAppEditorCancel'),
        screen.getByTestId('customAppEditorPreview'),
        screen.getByTestId('customAppEditorSave'),
      ];

      const order = buttons.map((button) =>
        Array.from(document.querySelectorAll('button')).indexOf(button as HTMLButtonElement)
      );
      expect(order).toEqual([...order].sort((first, second) => first - second));
    });
  });

  describe('saving', () => {
    it('hands over the edited document', async () => {
      const { onSave } = setup();
      await userEvent.click(outline('title'));
      await userEvent.type(screen.getByLabelText('Text'), '!');

      await userEvent.click(screen.getByTestId('customAppEditorSave'));

      const saved: AppDocument = onSave.mock.calls[0][0];
      expect(JSON.stringify(saved)).toContain('Service health!');
      expect(appDocumentSchema.safeParse(saved).success).toBe(true);
    });
  });

  describe('generating with chat', () => {
    it('is offered when chat is available, as Generate with chat', () => {
      setup({ withChat: true });

      expect(screen.getByTestId('customAppEditorGenerateWithChat')).toHaveTextContent(
        'Generate with chat'
      );
    });

    it('is not offered when chat is not available', () => {
      setup();

      expect(screen.queryByTestId('customAppEditorGenerateWithChat')).not.toBeInTheDocument();
    });

    it('sends the app as it is being edited, not as it was opened', async () => {
      const { onGenerateWithChat } = setup({ withChat: true });
      await userEvent.click(outline('title'));
      await userEvent.type(screen.getByLabelText('Text'), '!');

      await userEvent.click(screen.getByTestId('customAppEditorGenerateWithChat'));

      expect(onGenerateWithChat).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(onGenerateWithChat.mock.calls[0][0])).toContain('Service health!');
    });

    it('does not change what the editor shows or what has changed by itself', async () => {
      const { onGenerateWithChat, onSave } = setup({ withChat: true });

      await userEvent.click(screen.getByTestId('customAppEditorGenerateWithChat'));

      expect(onGenerateWithChat).toHaveBeenCalledWith(initialDocument());
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByTestId('customAppEditorSave')).toBeDisabled();
    });
  });
});
