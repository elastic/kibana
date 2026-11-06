/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { MockedCodeEditor } from '@kbn/code-editor-mock';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';
import { useKibana } from '../../../../common/lib/kibana';
import { BuildConnectorPage } from './build_connector_page';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/action_connector_api', () => ({
  ...(jest.requireActual('../../../lib/action_connector_api') as object),
  createConnectorType: jest.fn(),
  generateConnectorType: jest.fn(),
  fetchConnectorTypeLogo: jest.fn(),
  fetchDynamicConnectorTypes: jest.fn(),
  fetchDynamicConnectorTypeDefinition: jest.fn(),
  updateDynamicConnectorTypeEditable: jest.fn(),
}));
const mockCodeEditor = jest.fn();
jest.mock('@kbn/code-editor', () => ({
  ...(jest.requireActual('@kbn/code-editor') as object),
  CodeEditor: (props: React.ComponentProps<typeof MockedCodeEditor>) => {
    mockCodeEditor(props);
    return <MockedCodeEditor {...props} />;
  },
}));
const {
  createConnectorType,
  generateConnectorType,
  fetchConnectorTypeLogo,
  fetchDynamicConnectorTypes,
  fetchDynamicConnectorTypeDefinition,
  updateDynamicConnectorTypeEditable,
} = jest.requireMock('../../../lib/action_connector_api');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const minimalYamlDefinition = `
id: .acme
displayName: Acme
description: Talks to Acme
auth:
  type: none
config: []
actions:
  ping:
    description: Ping
    scope: read
    input: []
    request:
      method: GET
      url: https://acme.example.com/ping
`;

const yamlDefinition = `
id: .acme
displayName: Acme
description: Talks to Acme
auth:
  type: api_key_header
  headerName: X-Api-Key
config:
  - name: baseUrl
    type: string
    required: true
actions:
  ping:
    description: Ping
    scope: read
    input: []
    request:
      method: GET
      url: "{{config.baseUrl}}/ping"
`;

const yamlEditor = () =>
  within(screen.getByTestId('build-connector-start-yaml')).getByTestId('mockedCodeEditor');
const bodyEditor = (actionIndex: number) =>
  within(screen.getByTestId(`buildConnectorAction-${actionIndex}-body`)).getByTestId(
    'mockedCodeEditor'
  );

const authSelect = () => screen.getByTestId('buildConnectorAuthTypeSelect');

const authCheckbox = (label: string) =>
  within(authSelect()).getByRole('checkbox', { name: new RegExp(`^${label}`) });

const selectAuthType = async (label: string) => {
  expect(authCheckbox(label)).not.toBeChecked();
  await userEvent.click(authCheckbox(label));
};

const removeAuthType = async (label: string) => {
  expect(authCheckbox(label)).toBeChecked();
  await userEvent.click(authCheckbox(label));
};

const typeYaml = async (yaml: string) => {
  if (screen.queryByTestId('build-connector-page-back-to-start')) {
    await userEvent.click(screen.getByTestId('build-connector-page-back-to-start'));
  }
  await userEvent.click(await screen.findByTestId('build-connector-start-import-yaml'));
  fireEvent.change(yamlEditor(), { target: { value: yaml } });
};

const applyYaml = async (yaml: string) => {
  await typeYaml(yaml);
  await userEvent.click(screen.getByTestId('build-connector-yaml-apply-btn'));
  await waitFor(() => expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('Acme'));
};

describe('BuildConnectorPage', () => {
  let appMockRenderer: AppMockRenderer;
  const history = createMemoryHistory({ initialEntries: ['/connectors/build'] });

  const renderStartPage = () =>
    appMockRenderer.render(
      <Router history={history}>
        <MockAppHeaderProvider>
          <BuildConnectorPage />
        </MockAppHeaderProvider>
      </Router>
    );

  const renderPage = () => {
    renderStartPage();
    const startFromScratch = screen.queryByTestId('build-connector-start-scratch');
    if (startFromScratch) fireEvent.click(startFromScratch);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchConnectorTypeLogo.mockReset().mockRejectedValue(new Error('Favicon not found'));
    history.push('/connectors/build');
    appMockRenderer = createAppMockRenderer();
    createConnectorType.mockResolvedValue({ id: 'acme' });
    fetchDynamicConnectorTypes.mockResolvedValue([]);
    fetchDynamicConnectorTypeDefinition.mockResolvedValue({
      id: 'acme',
      displayName: 'Acme',
      description: 'Acme API',
      icon: 'data:image/png;base64,abc',
      auth: { type: 'api_key_header', headerName: 'X-Api-Key' },
      config: [{ name: 'baseUrl', type: 'string', required: true }],
      actions: {
        ping: {
          description: 'Ping',
          scope: 'read',
          input: [],
          request: { method: 'GET', url: 'https://acme.example.com/ping' },
        },
      },
    });
  });

  it('shows AI first, with YAML and scratch as secondary paths', async () => {
    renderStartPage();

    expect(screen.getByTestId('build-connector-start')).toBeInTheDocument();
    expect(screen.getByText('AI assistant')).toBeInTheDocument();
    expect(screen.getByTestId('build-connector-ai-url')).toBeInTheDocument();
    expect(screen.getByTestId('build-connector-ai-generate-btn')).toHaveTextContent(
      'Generate draft'
    );
    expect(screen.getByTestId('build-connector-start-import-yaml')).toBeInTheDocument();
    expect(screen.getByTestId('build-connector-start-scratch')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByTestId('created-types-section')).not.toBeInTheDocument()
    );
    expect(screen.queryByTestId('build-connector-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('build-connector-page-save-btn')).not.toBeInTheDocument();
  });

  it('shows a load error and retries the created types list', async () => {
    fetchDynamicConnectorTypes
      .mockRejectedValueOnce(new Error('request failed'))
      .mockResolvedValueOnce([{ id: '.acme', name: 'Acme' }]);
    renderStartPage();

    expect(await screen.findByTestId('created-types-error')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('created-types-retry'));

    expect(await screen.findByTestId('edit-dynamic-connector-.acme')).toBeInTheDocument();
  });

  it('edits connector metadata and connection test while keeping auth, config and actions read-only', async () => {
    fetchDynamicConnectorTypes.mockResolvedValue([
      { id: '.acme', name: 'Acme', description: 'Acme API', icon: 'data:image/png;base64,abc' },
    ]);
    renderStartPage();

    await userEvent.click(await screen.findByTestId('edit-dynamic-connector-.acme'));
    expect(fetchDynamicConnectorTypeDefinition).toHaveBeenCalledWith(
      expect.objectContaining({ id: '.acme' })
    );
    expect(await screen.findByTestId('build-connector-form')).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('acme');
    expect(screen.getByTestId('buildConnectorIdInput')).toBeDisabled();
    expect(
      screen.getByText(
        /connector ID, authentication, configuration fields and actions cannot be changed/
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('Acme');
    expect(screen.getByTestId('buildConnectorAuthTypeSelect')).toBeInTheDocument();
    expect(authCheckbox('API key header')).toBeDisabled();
    expect(screen.getByTestId('buildConnectorAuthHeaderNameInput')).toBeDisabled();
    expect(screen.getByTestId('buildConnectorConfigFields-add')).toBeDisabled();
    expect(screen.getByTestId('buildConnectorTest-url')).toBeEnabled();
    const actionName = screen.getByTestId('buildConnectorAction-0-name');
    expect(actionName).toBeDisabled();
    const actionToggle = screen.getByTestId('buildConnectorAction-0-toggle');
    expect(actionName).toBeVisible();
    await userEvent.click(actionToggle);
    await waitFor(() => expect(actionName).not.toBeVisible());
    await userEvent.click(actionToggle);
    await waitFor(() => expect(actionName).toBeVisible());
    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({ options: expect.objectContaining({ readOnly: true }) })
    );
    expect(
      mockCodeEditor.mock.calls.find(
        ([props]) => props?.dataTestSubj === 'buildConnectorTest-body-editor'
      )?.[0].options
    ).not.toHaveProperty('readOnly', true);

    await userEvent.clear(screen.getByTestId('buildConnectorNameInput'));
    await userEvent.type(screen.getByTestId('buildConnectorNameInput'), 'Acme Search');
    const logoDataUri = 'data:image/png;base64,aGVsbG8=';
    fireEvent.change(screen.getByTestId('buildConnectorTest-url'), {
      target: { value: 'https://acme.example.com/ping' },
    });
    fetchConnectorTypeLogo.mockResolvedValue({ icon: logoDataUri });
    fireEvent.change(screen.getByTestId('buildConnectorLogoUrlInput'), {
      target: { value: 'https://acme.example.com/logo.png' },
    });
    updateDynamicConnectorTypeEditable.mockResolvedValue({ id: '.acme' });
    await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

    expect(updateDynamicConnectorTypeEditable).toHaveBeenCalledWith(
      expect.objectContaining({ id: '.acme', displayName: 'Acme Search', icon: logoDataUri })
    );
    expect(updateDynamicConnectorTypeEditable).toHaveBeenCalledWith(
      expect.objectContaining({
        test: expect.objectContaining({
          request: expect.objectContaining({ url: 'https://acme.example.com/ping' }),
        }),
      })
    );
    expect(fetchConnectorTypeLogo).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://acme.example.com/logo.png' })
    );
    expect(createConnectorType).not.toHaveBeenCalled();
  });

  it('does not save edit metadata when the pending logo fetch fails', async () => {
    fetchDynamicConnectorTypes.mockResolvedValue([{ id: '.acme', name: 'Acme' }]);
    fetchConnectorTypeLogo.mockRejectedValueOnce({ body: { message: 'Not an image.' } });
    renderStartPage();

    await userEvent.click(await screen.findByTestId('edit-dynamic-connector-.acme'));
    fireEvent.change(await screen.findByTestId('buildConnectorLogoUrlInput'), {
      target: { value: 'https://acme.example.com/logo.png' },
    });
    fireEvent.click(screen.getByTestId('build-connector-page-save-btn'));

    expect(await screen.findByText('Not an image.')).toBeInTheDocument();
    expect(updateDynamicConnectorTypeEditable).not.toHaveBeenCalled();
  });

  it('does not apply a logo response after its URL changes', async () => {
    fetchDynamicConnectorTypes.mockResolvedValue([{ id: '.acme', name: 'Acme' }]);
    let resolveLogo: (value: { icon: string }) => void = () => {};
    fetchConnectorTypeLogo.mockReturnValueOnce(
      new Promise<{ icon: string }>((resolve) => {
        resolveLogo = resolve;
      })
    );
    renderStartPage();

    await userEvent.click(await screen.findByTestId('edit-dynamic-connector-.acme'));
    const logoUrlInput = await screen.findByTestId('buildConnectorLogoUrlInput');
    fireEvent.change(logoUrlInput, {
      target: { value: 'https://acme.example.com/old-logo.png' },
    });
    fireEvent.click(screen.getByTestId('build-connector-page-save-btn'));
    fireEvent.change(logoUrlInput, {
      target: { value: 'https://acme.example.com/new-logo.png' },
    });
    resolveLogo({ icon: 'data:image/png;base64,aGVsbG8=' });

    expect(
      await screen.findByText('The logo URL changed while it was loading. Save again.')
    ).toBeInTheDocument();
    expect(updateDynamicConnectorTypeEditable).not.toHaveBeenCalled();
  });

  it('opens the empty form from Start from scratch', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Connector type builder' })
    ).toBeInTheDocument();

    const detailsStep = screen.getByTestId('build-connector-page-step-details');
    expect(detailsStep).toHaveTextContent('Connector details');
    expect(within(detailsStep).queryByTestId('build-connector-ai-url')).not.toBeInTheDocument();
    expect(within(detailsStep).getByTestId('buildConnectorNameInput')).toBeInTheDocument();
    expect(within(detailsStep).getByTestId('buildConnectorIdInput')).toBeInTheDocument();
    expect(within(detailsStep).getByTestId('buildConnectorDescriptionInput')).toBeInTheDocument();
    expect(within(detailsStep).getByTestId('buildConnectorAuthTypeSelect')).toBeInTheDocument();

    const configStep = screen.getByTestId('build-connector-page-step-config');
    expect(configStep).toHaveTextContent('Configuration fields');
    expect(within(configStep).getByTestId('buildConnectorConfigFields-add')).toBeInTheDocument();
    expect(within(configStep).getByTestId('buildConnectorConfigFields-info')).toBeInTheDocument();
    expect(within(configStep).queryByRole('heading', { name: 'Config' })).not.toBeInTheDocument();

    const actionsStep = screen.getByTestId('build-connector-page-step-actions');
    expect(actionsStep).toHaveTextContent('Actions');
    expect(within(actionsStep).getByTestId('buildConnectorAction-0')).toBeInTheDocument();
    expect(
      within(actionsStep).queryByRole('heading', { name: 'Actions', level: 4 })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('build-connector-page-cancel-btn')).toBeInTheDocument();
    expect(screen.getByTestId('build-connector-page-save-btn')).toBeInTheDocument();
    expect(useKibanaMock().services.setBreadcrumbs).toHaveBeenCalledWith([
      expect.objectContaining({ text: 'Connectors', href: '/connectors' }),
      expect.objectContaining({ text: 'Build' }),
    ]);
    expect(useKibanaMock().services.chrome.docTitle.change).toHaveBeenCalledWith(
      'Connector type builder'
    );
  });

  it('returns to the start screen from an empty form', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('build-connector-page-back-to-start'));

    expect(screen.getByTestId('build-connector-start')).toBeInTheDocument();
    expect(useKibanaMock().services.overlays.openConfirm).not.toHaveBeenCalled();
  });

  it('returns to the builder start from the header back arrow while editing', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('link', { name: /Connector type builder/ }));

    expect(await screen.findByTestId('build-connector-start')).toBeInTheDocument();
  });

  it('confirms before discarding edits when returning to the start screen', async () => {
    renderPage();
    await userEvent.type(screen.getByTestId('buildConnectorNameInput'), 'Draft');
    const confirm = jest.spyOn(useKibanaMock().services.overlays, 'openConfirm');
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await userEvent.click(screen.getByTestId('build-connector-page-back-to-start'));
    expect(screen.getByTestId('build-connector-form')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('build-connector-page-back-to-start'));
    expect(screen.getByTestId('build-connector-start')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('build-connector-start-scratch'));
    expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('');
  });

  it('starts from a draft handed off in the router state', async () => {
    history.push({
      pathname: '/connectors/build',
      state: {
        initialDefinition: {
          id: 'jsonplaceholder',
          displayName: 'JSONPlaceholder',
          description: 'Read posts',
          icon: 'data:image/x-icon;base64,AAABAAE=',
          logoUrl: 'https://jsonplaceholder.typicode.com/favicon.ico',
          config: [],
          auth: { type: 'none' },
          actions: {
            getPosts: {
              description: 'Get posts',
              scope: 'read',
              input: [],
              request: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts' },
            },
          },
        },
      },
    });

    renderPage();

    expect(await screen.findByTestId('buildConnectorNameInput')).toHaveValue('JSONPlaceholder');
    expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('jsonplaceholder');
    expect(screen.getByTestId('buildConnectorLogoUrlInput')).toHaveValue(
      'https://jsonplaceholder.typicode.com/favicon.ico'
    );
    expect(screen.getByTestId('buildConnectorLogoPreview')).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorAction-0-name')).toHaveValue('getPosts');
    expect(screen.getByTestId('buildConnectorAction-0-url')).toHaveValue(
      'https://jsonplaceholder.typicode.com/posts'
    );
  });

  it('goes back to the connectors list on Cancel without saving', async () => {
    renderPage();

    await userEvent.click(await screen.findByTestId('build-connector-page-cancel-btn'));

    expect(history.location.pathname).toBe('/connectors');
    expect(createConnectorType).not.toHaveBeenCalled();
  });

  it('saves the definition and returns to the connectors list', async () => {
    renderPage();

    await applyYaml(minimalYamlDefinition);
    await waitFor(() => expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('Acme'));
    expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('acme');

    await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));
    expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('acme');

    await waitFor(() =>
      expect(createConnectorType).toHaveBeenCalledWith(
        expect.objectContaining({ connectorType: expect.objectContaining({ id: 'acme' }) })
      )
    );
    await waitFor(() => expect(history.location.pathname).toBe('/connectors'));
  });

  it('stays on the page and shows the errors when the definition is invalid', async () => {
    renderPage();

    await userEvent.click(await screen.findByTestId('build-connector-page-save-btn'));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('URL is required.')).toBeInTheDocument();
    expect(screen.queryByTestId('build-connector-page-definition-errors')).not.toBeInTheDocument();
    expect(createConnectorType).not.toHaveBeenCalled();
    expect(history.location.pathname).toBe('/connectors/build');
  });

  it('renders the form fields, one empty action and the footer buttons', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Connector type builder' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('build-connector-start')).not.toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorNameInput')).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorIdInput')).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorDescriptionInput')).toBeInTheDocument();
    expect(authCheckbox('None')).toBeChecked();
    expect(screen.queryByTestId('buildConnectorAuthHeaderNameInput')).not.toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorConfigFields')).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorAction-0')).toBeInTheDocument();
    expect(screen.queryByTestId('buildConnectorAction-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorAction-0-scope')).toHaveValue('write');
    expect(screen.getByTestId('buildConnectorAction-0-method')).toHaveValue('POST');
    expect(screen.getByTestId('build-connector-page-cancel-btn')).toBeInTheDocument();
    expect(screen.getByTestId('build-connector-page-save-btn')).toBeInTheDocument();
  });

  it('lets the user drag the YAML and JSON body editors taller', async () => {
    renderStartPage();
    await userEvent.click(screen.getByTestId('build-connector-start-import-yaml'));

    expect(screen.getByTestId('build-connector-yaml-editor-container')).toHaveStyle({
      resize: 'vertical',
    });
    await userEvent.click(screen.getByTestId('build-connector-start-scratch'));
    await screen.findByTestId('buildConnectorAction-0-body');
    expect(screen.getByTestId('buildConnectorAction-0-body-editor-container')).toHaveStyle({
      resize: 'vertical',
    });
    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({ languageId: 'yaml', height: 220 })
    );
    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({ languageId: 'json', height: 160 })
    );
    expect(mockCodeEditor).not.toHaveBeenCalledWith(
      expect.objectContaining({ allowFullScreen: true })
    );
  });

  it('derives the ID from the name until it is customized', async () => {
    renderPage();

    await userEvent.type(await screen.findByTestId('buildConnectorNameInput'), 'My Service');
    await waitFor(() =>
      expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('my-service')
    );

    await userEvent.clear(screen.getByTestId('buildConnectorIdInput'));
    await userEvent.type(screen.getByTestId('buildConnectorIdInput'), '.custom');
    await userEvent.type(screen.getByTestId('buildConnectorNameInput'), ' Two');

    await waitFor(() =>
      expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('My Service Two')
    );
    expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('.custom');
  });

  it('shows the header name field only for API key header auth', async () => {
    renderPage();

    await screen.findByTestId('buildConnectorAuthTypeSelect');
    await selectAuthType('API key header');
    expect(await screen.findByTestId('buildConnectorAuthHeaderNameInput')).toBeInTheDocument();

    await removeAuthType('API key header');
    await waitFor(() =>
      expect(screen.queryByTestId('buildConnectorAuthHeaderNameInput')).not.toBeInTheDocument()
    );
  });

  describe('tooltips', () => {
    it('explains the config object', async () => {
      renderPage();

      expect(await screen.findByTestId('buildConnectorConfigFields-description')).toHaveTextContent(
        'Entered when a connector of this type is created. Use as {{config.<name>}}.'
      );
      fireEvent.mouseOver(screen.getByTestId('buildConnectorConfigFields-info'));
      expect(
        await screen.findByText(/entered once, when a user creates a connector of this type/)
      ).toBeInTheDocument();
    });

    it('explains the params object of an action', async () => {
      renderPage();

      expect(
        await screen.findByTestId('buildConnectorAction-0-input-description')
      ).toHaveTextContent(
        'Provided by a rule each time this action runs. Use as {{input.<name>}}.'
      );
      fireEvent.mouseOver(screen.getByTestId('buildConnectorAction-0-input-info'));
      expect(
        await screen.findByText(/provided by a rule each time this action runs/)
      ).toBeInTheDocument();
    });

    it('explains the label property of a field', async () => {
      renderPage();

      await userEvent.click(await screen.findByTestId('buildConnectorConfigFields-add'));
      fireEvent.mouseOver(screen.getByTestId('buildConnectorConfigFields-0-label-info'));

      expect(
        await screen.findByText(/Display name of this field in the form where its value is entered/)
      ).toBeInTheDocument();
    });
  });

  describe('YAML import', () => {
    it('shows an error and disables the YAML buttons while the YAML is invalid', async () => {
      renderPage();

      await typeYaml('id: [unclosed');
      expect(await screen.findByText(/Flow sequence/)).toBeInTheDocument();
      expect(screen.getByTestId('build-connector-yaml-apply-btn')).toBeDisabled();
      expect(screen.getByTestId('build-connector-yaml-beautify-btn')).toBeDisabled();

      fireEvent.change(yamlEditor(), { target: { value: '- just\n- a list\n' } });
      expect(
        await screen.findByText('The YAML must describe a single connector type definition.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('build-connector-yaml-apply-btn')).toBeDisabled();
    });

    it('rejects a definition whose config or input is a map instead of a list', async () => {
      renderPage();

      await typeYaml('displayName: Acme\nconfig:\n  baseUrl:\n    type: string\n');
      expect(
        await screen.findByText(
          '"config" must be a list of fields, each with a name and a type (and optionally required, label and description).'
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('build-connector-yaml-apply-btn')).toBeDisabled();

      fireEvent.change(yamlEditor(), {
        target: { value: 'actions:\n  ping:\n    input:\n      message: string\n' },
      });
      expect(
        await screen.findByText(/"actions\.ping\.input" must be a list of fields/)
      ).toBeInTheDocument();

      fireEvent.change(yamlEditor(), { target: { value: 'actions:\n  - ping\n' } });
      expect(
        await screen.findByText('"actions" must be a map keyed by action name.')
      ).toBeInTheDocument();
    });

    it('rejects unknown keys and names the allowed ones', async () => {
      renderPage();

      await typeYaml(yamlDefinition.replace('input: []', 'params: []'));
      expect(
        await screen.findByText(
          '"actions.ping" has an unknown key "params". Allowed keys: description, scope, input, request.'
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('build-connector-yaml-apply-btn')).toBeDisabled();

      fireEvent.change(yamlEditor(), { target: { value: 'name: Acme\n' } });
      expect(
        await screen.findByText(
          'Unknown top-level key "name". Allowed keys: id, displayName, description, icon, auth, config, test, actions.'
        )
      ).toBeInTheDocument();
    });

    it('shows what the schema rejects right after applying, before Save', async () => {
      renderPage();

      await applyYaml(yamlDefinition.replace('{{config.baseUrl}}', '{{config.missing}}'));

      expect(await screen.findByTestId('buildConnectorAction-0-request-error')).toHaveTextContent(
        'Template reference "config.missing" is not declared for this connector or action.'
      );
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('beautifies the YAML in place', async () => {
      renderPage();

      await typeYaml('{id: .acme, displayName: Acme,   auth: {type: none}}');
      await userEvent.click(screen.getByTestId('build-connector-yaml-beautify-btn'));

      await waitFor(() =>
        expect(yamlEditor()).toHaveValue('id: .acme\ndisplayName: Acme\nauth:\n  type: none\n')
      );
    });

    it('fills the whole form from the YAML without submitting', async () => {
      renderPage();

      await applyYaml(yamlDefinition);

      expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('acme');
      expect(screen.getByTestId('buildConnectorDescriptionInput')).toHaveValue('Talks to Acme');
      expect(authCheckbox('API key header')).toBeChecked();
      expect(screen.getByTestId('buildConnectorAuthHeaderNameInput')).toHaveValue('X-Api-Key');
      expect(screen.getByTestId('buildConnectorConfigFields-0-name')).toHaveValue('baseUrl');
      expect(screen.getByTestId('buildConnectorConfigFields-0-required')).toBeChecked();
      expect(screen.getByTestId('buildConnectorAction-0-name')).toHaveValue('ping');
      expect(screen.getByTestId('buildConnectorAction-0-description')).toHaveValue('Ping');
      expect(screen.getByTestId('buildConnectorAction-0-scope')).toHaveValue('read');
      expect(screen.getByTestId('buildConnectorAction-0-method')).toHaveValue('GET');
      expect(screen.getByTestId('buildConnectorAction-0-url')).toHaveValue(
        '{{config.baseUrl}}/ping'
      );
      expect(fetchConnectorTypeLogo).not.toHaveBeenCalled();
      expect(screen.getByTestId('buildConnectorLogoUrlInput')).toHaveValue('');
      expect(screen.queryByTestId('buildConnectorAction-1')).not.toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
      expect(history.location.pathname).toBe('/connectors/build');
    });

    it('submits the applied definition unchanged when Save is clicked', async () => {
      renderPage();

      await applyYaml(yamlDefinition);
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: {
              id: 'acme',
              displayName: 'Acme',
              description: 'Talks to Acme',
              auth: { type: 'api_key_header', headerName: 'X-Api-Key' },
              config: [{ name: 'baseUrl', type: 'string', required: true }],
              actions: {
                ping: {
                  description: 'Ping',
                  scope: 'read',
                  input: [],
                  request: { method: 'GET', url: '{{config.baseUrl}}/ping' },
                },
              },
            },
          })
        )
      );
      await waitFor(() => expect(history.location.pathname).toBe('/connectors'));
    });

    it('carries an optional request path through the form and the request', async () => {
      renderPage();

      await applyYaml(
        yamlDefinition.replace(
          'url: "{{config.baseUrl}}/ping"',
          'url: "{{config.baseUrl}}"\n      path: /v1/ping'
        )
      );
      expect(screen.getByTestId('buildConnectorAction-0-url')).toHaveValue('{{config.baseUrl}}');
      expect(screen.getByTestId('buildConnectorAction-0-path')).toHaveValue('/v1/ping');

      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({
              actions: {
                ping: expect.objectContaining({
                  request: { method: 'GET', url: '{{config.baseUrl}}', path: '/v1/ping' },
                }),
              },
            }),
          })
        )
      );
    });

    it('reports a template reference issue under the request that uses it', async () => {
      renderPage();

      await applyYaml(yamlDefinition.replace('{{config.baseUrl}}', '{{config.missing}}'));
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(await screen.findByTestId('buildConnectorAction-0-request-error')).toHaveTextContent(
        'Template reference "config.missing" is not declared for this connector or action.'
      );
      expect(createConnectorType).not.toHaveBeenCalled();
    });
  });

  describe('config fields', () => {
    it('adds and removes rows', async () => {
      renderPage();

      expect(screen.queryByTestId('buildConnectorConfigFields-row-0')).not.toBeInTheDocument();

      await userEvent.click(await screen.findByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-0-name'), 'baseUrl');
      await userEvent.selectOptions(
        screen.getByTestId('buildConnectorConfigFields-0-type'),
        'number'
      );
      await userEvent.click(screen.getByTestId('buildConnectorConfigFields-0-required'));
      await userEvent.click(screen.getByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-1-name'), 'region');

      expect(screen.getByTestId('buildConnectorConfigFields-0-type')).toHaveValue('number');
      expect(screen.getByTestId('buildConnectorConfigFields-0-required')).toBeChecked();

      await userEvent.click(screen.getByTestId('buildConnectorConfigFields-0-remove'));

      await waitFor(() =>
        expect(screen.queryByTestId('buildConnectorConfigFields-row-1')).not.toBeInTheDocument()
      );
      expect(screen.getByTestId('buildConnectorConfigFields-0-name')).toHaveValue('region');
    });

    it('shows a row error for an invalid field name', async () => {
      renderPage();

      await userEvent.click(await screen.findByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-0-name'), '1bad');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(
        await screen.findByText('Must start with a letter and use only letters, numbers and "_".')
      ).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('shows a list error for duplicate field names', async () => {
      renderPage();

      await userEvent.click(await screen.findByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-0-name'), 'baseUrl');
      await userEvent.click(screen.getByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-1-name'), 'baseUrl');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(await screen.findByTestId('buildConnectorConfigFields-error')).toHaveTextContent(
        'Field names must be unique.'
      );
      expect(createConnectorType).not.toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    it('submits an action built in the form with input fields, headers and a JSON body', async () => {
      renderPage();

      await userEvent.type(await screen.findByTestId('buildConnectorNameInput'), 'My Service');
      await userEvent.type(screen.getByTestId('buildConnectorAction-0-name'), 'notify');
      await userEvent.type(screen.getByTestId('buildConnectorAction-0-description'), 'Send it');
      await userEvent.click(screen.getByTestId('buildConnectorAction-0-input-add'));
      await userEvent.type(screen.getByTestId('buildConnectorAction-0-input-0-name'), 'message');
      await userEvent.type(
        screen.getByTestId('buildConnectorAction-0-url'),
        'https://example.com/notify'
      );
      await userEvent.click(screen.getByTestId('buildConnectorAction-0-headers-add'));
      await userEvent.type(
        screen.getByTestId('buildConnectorAction-0-headers-0-key'),
        'Content-Type'
      );
      await userEvent.type(
        screen.getByTestId('buildConnectorAction-0-headers-0-value'),
        'application/json'
      );
      fireEvent.change(bodyEditor(0), { target: { value: '{"text": "{{input.message}}"}' } });
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({
              id: 'my-service',
              actions: {
                notify: {
                  description: 'Send it',
                  scope: 'write',
                  input: [{ name: 'message', type: 'string', required: false }],
                  request: {
                    method: 'POST',
                    url: 'https://example.com/notify',
                    headers: { 'Content-Type': 'application/json' },
                    body: { text: '{{input.message}}' },
                  },
                },
              },
            }),
          })
        )
      );
      await waitFor(() => expect(history.location.pathname).toBe('/connectors'));
    });

    it('adds and removes actions and requires at least one', async () => {
      renderPage();

      await userEvent.click(await screen.findByTestId('buildConnectorActions-add'));
      expect(screen.getByTestId('buildConnectorAction-1')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('buildConnectorAction-1-remove'));
      await userEvent.click(screen.getByTestId('buildConnectorAction-0-remove'));
      await waitFor(() =>
        expect(screen.queryByTestId('buildConnectorAction-0')).not.toBeInTheDocument()
      );

      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(await screen.findByTestId('buildConnectorActions-error')).toHaveTextContent(
        'At least one action is required.'
      );
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('shows the required and format errors of an action on Save', async () => {
      renderPage();

      await userEvent.click(await screen.findByTestId('buildConnectorAction-0-headers-add'));
      await userEvent.type(
        screen.getByTestId('buildConnectorAction-0-headers-0-key'),
        'bad header'
      );
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
      expect(screen.getByText('Connector type ID is required.')).toBeInTheDocument();
      expect(screen.getByText('Action name is required.')).toBeInTheDocument();
      expect(screen.getByText('URL is required.')).toBeInTheDocument();
      expect(screen.getByText('Use only letters, numbers and "-".')).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
      expect(history.location.pathname).toBe('/connectors/build');
    });

    it('rejects duplicate action names', async () => {
      renderPage();

      await userEvent.type(await screen.findByTestId('buildConnectorAction-0-name'), 'ping');
      await userEvent.click(screen.getByTestId('buildConnectorActions-add'));
      await userEvent.type(screen.getByTestId('buildConnectorAction-1-name'), 'ping');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(await screen.findByText('Action names must be unique.')).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('validates the JSON body as you type and beautifies it', async () => {
      renderPage();

      await screen.findByTestId('buildConnectorAction-0-body');
      const beautify = screen.getByTestId('buildConnectorAction-0-body-beautify');
      expect(beautify).toBeDisabled();

      fireEvent.change(bodyEditor(0), { target: { value: '{"a":' } });
      expect(await screen.findByText('Must be valid JSON.')).toBeInTheDocument();
      expect(beautify).toBeDisabled();

      fireEvent.change(bodyEditor(0), { target: { value: '[1, 2]' } });
      expect(await screen.findByText('Must be a JSON object.')).toBeInTheDocument();

      fireEvent.change(bodyEditor(0), { target: { value: '{"a":1,"b":{"c":true}}' } });
      await waitFor(() => expect(beautify).toBeEnabled());
      await userEvent.click(beautify);

      await waitFor(() =>
        expect(bodyEditor(0)).toHaveValue('{\n  "a": 1,\n  "b": {\n    "c": true\n  }\n}')
      );
      expect(screen.queryByText('Must be valid JSON.')).not.toBeInTheDocument();
    });
  });

  describe('AI assistant', () => {
    const generatedConnectorType = {
      id: 'acme',
      displayName: 'Acme',
      description: 'Talks to Acme',
      auth: { type: 'api_key_header' as const, headerName: 'X-Api-Key' },
      config: [
        {
          name: 'baseUrl',
          type: 'string' as const,
          required: true,
          default: 'https://api.acme.com',
        },
      ],
      actions: {
        ping: {
          description: 'Ping',
          scope: 'read' as const,
          input: [],
          request: { method: 'GET' as const, url: '{{config.baseUrl}}/ping' },
        },
      },
    };

    const openAiPanel = async () => {
      if (screen.queryByTestId('build-connector-page-back-to-start')) {
        await userEvent.click(screen.getByTestId('build-connector-page-back-to-start'));
      }
    };

    it('shows the URL field on the start screen', async () => {
      renderPage();

      await openAiPanel();
      expect(screen.getByTestId('build-connector-ai-url')).toBeInTheDocument();
      expect(
        screen.getByText('Enter a public API documentation URL. Review the draft before saving.')
      ).toBeInTheDocument();
    });

    it('disables Generate for an empty or non-http URL', async () => {
      renderPage();
      await openAiPanel();

      const generateButton = screen.getByTestId('build-connector-ai-generate-btn');
      expect(generateButton).toBeDisabled();

      await userEvent.type(screen.getByTestId('build-connector-ai-url'), 'not-a-url');
      expect(generateButton).toBeDisabled();

      await userEvent.clear(screen.getByTestId('build-connector-ai-url'));
      await userEvent.type(screen.getByTestId('build-connector-ai-url'), 'ftp://example.com/docs');
      expect(generateButton).toBeDisabled();
      expect(generateConnectorType).not.toHaveBeenCalled();
    });

    it('fills the form from a generated draft and does not save it', async () => {
      generateConnectorType.mockResolvedValue({ connectorType: generatedConnectorType });
      renderPage();
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-ai-generate-btn'));

      await waitFor(() =>
        expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('Acme')
      );
      expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('acme');
      expect(authCheckbox('API key header')).toBeChecked();
      expect(screen.getByTestId('buildConnectorAuthHeaderNameInput')).toHaveValue('X-Api-Key');
      expect(screen.getByTestId('buildConnectorConfigFields-0-default')).toHaveValue(
        'https://api.acme.com'
      );
      expect(screen.getByTestId('buildConnectorAction-0-name')).toHaveValue('ping');
      expect(screen.getByTestId('buildConnectorAction-0-url')).toHaveValue(
        '{{config.baseUrl}}/ping'
      );
      expect(screen.queryByTestId('build-connector-start')).not.toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
      expect(history.location.pathname).toBe('/connectors/build');
    });

    it('adds a valid documentation site favicon to the draft form', async () => {
      const icon = 'data:image/x-icon;base64,AAABAAE=';
      generateConnectorType.mockResolvedValue({
        connectorType: generatedConnectorType,
        logoUrl: 'https://docs.example.com/brand/icon.ico',
      });
      fetchConnectorTypeLogo.mockResolvedValue({ icon });
      renderPage();
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-ai-url'),
        'https://docs.example.com/api/reference'
      );
      await userEvent.click(screen.getByTestId('build-connector-ai-generate-btn'));

      await waitFor(() =>
        expect(screen.getByTestId('buildConnectorLogoUrlInput')).toHaveValue(
          'https://docs.example.com/brand/icon.ico'
        )
      );
      expect(fetchConnectorTypeLogo).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://docs.example.com/brand/icon.ico' })
      );
      expect(screen.getByTestId('buildConnectorLogoPreview')).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('tries the default favicon when the documented icon cannot be loaded', async () => {
      generateConnectorType.mockResolvedValue({
        connectorType: generatedConnectorType,
        logoUrl: 'https://docs.example.com/brand.svg',
      });
      fetchConnectorTypeLogo
        .mockRejectedValueOnce(new Error('Unsupported icon'))
        .mockResolvedValueOnce({ icon: 'data:image/x-icon;base64,AAABAAE=' });
      renderPage();
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-ai-generate-btn'));

      await waitFor(() =>
        expect(screen.getByTestId('buildConnectorLogoUrlInput')).toHaveValue(
          'https://docs.example.com/favicon.ico'
        )
      );
      expect(fetchConnectorTypeLogo).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ url: 'https://docs.example.com/brand.svg' })
      );
      expect(fetchConnectorTypeLogo).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ url: 'https://docs.example.com/favicon.ico' })
      );
    });

    it('keeps generated array item types when saving', async () => {
      generateConnectorType.mockResolvedValue({
        connectorType: {
          ...generatedConnectorType,
          actions: {
            ...generatedConnectorType.actions,
            get_blacklist: {
              description: 'Get blacklist',
              scope: 'read',
              input: [{ name: 'onlyCountries', type: 'array', items: 'string', required: false }],
              request: { method: 'GET', url: '{{config.baseUrl}}', path: '/blacklist' },
            },
          },
        },
      });
      renderPage();
      await openAiPanel();
      await userEvent.type(
        screen.getByTestId('build-connector-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-ai-generate-btn'));

      expect(await screen.findByTestId('buildConnectorAction-1-input-0-type')).toHaveValue('array');
      expect(screen.getByTestId('buildConnectorAction-1-input-0-items')).toHaveValue('string');
      expect(screen.queryByText('Array fields require an item type.')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));
      await waitFor(() => expect(createConnectorType).toHaveBeenCalledTimes(1));
      expect(createConnectorType).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorType: expect.objectContaining({
            config: [
              {
                name: 'baseUrl',
                type: 'string',
                required: true,
                default: 'https://api.acme.com',
              },
            ],
            actions: expect.objectContaining({
              get_blacklist: expect.objectContaining({
                input: [{ name: 'onlyCountries', type: 'array', items: 'string', required: false }],
              }),
            }),
          }),
        })
      );
    });

    it('shows a generated field error under its param', async () => {
      generateConnectorType.mockResolvedValue({
        connectorType: {
          ...generatedConnectorType,
          actions: {
            ...generatedConnectorType.actions,
            get_blacklist: {
              description: 'Get blacklist',
              scope: 'read',
              input: [{ name: 'onlyCountries', type: 'array', required: false }],
              request: { method: 'GET', url: '{{config.baseUrl}}', path: '/blacklist' },
            },
          },
        },
      });
      renderPage();
      await openAiPanel();
      await userEvent.type(
        screen.getByTestId('build-connector-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-ai-generate-btn'));

      expect(await screen.findByText('Array fields require an item type.')).toBeInTheDocument();
      expect(
        screen.queryByTestId('build-connector-page-definition-errors')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('buildConnectorAction-1-input-0-items')).toHaveValue('');
      await userEvent.selectOptions(
        screen.getByTestId('buildConnectorAction-1-input-0-items'),
        'string'
      );
      await waitFor(() =>
        expect(screen.queryByText('Array fields require an item type.')).not.toBeInTheDocument()
      );
    });

    it('shows the callout and guidance for a typed API error', async () => {
      generateConnectorType.mockRejectedValue({
        body: {
          message: 'That host is not allowed.',
          attributes: { reason: 'blocked_destination' },
        },
      });
      renderPage();
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-ai-generate-btn'));

      const callout = await screen.findByTestId('build-connector-ai-error');
      expect(callout).toHaveTextContent('That host is not allowed.');
      expect(callout).toHaveTextContent('Use a public https documentation URL.');
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('shows Feature Settings guidance when no model is configured', async () => {
      generateConnectorType.mockRejectedValue({
        body: {
          message: 'No AI model is available.',
          attributes: { reason: 'no_model' },
        },
      });
      renderPage();
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-ai-generate-btn'));

      const callout = await screen.findByTestId('build-connector-ai-error');
      expect(callout).toHaveTextContent(
        'Set a default AI connector, or pick a model for Connector type builder in Feature Settings.'
      );
      expect(callout).not.toHaveTextContent('No AI model is available.');
    });

    it('shows try another page guidance when the model output is invalid', async () => {
      generateConnectorType.mockRejectedValue({
        body: {
          message: 'The model did not return a valid connector type.',
          attributes: { reason: 'invalid_output' },
        },
      });
      renderPage();
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-ai-generate-btn'));

      expect(await screen.findByTestId('build-connector-ai-error')).toHaveTextContent(
        'Try again or another page, then edit the form by hand.'
      );
    });

    it('submits the generated draft when Save is clicked', async () => {
      generateConnectorType.mockResolvedValue({ connectorType: generatedConnectorType });
      renderPage();
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-ai-generate-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('Acme')
      );

      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: {
              id: 'acme',
              displayName: 'Acme',
              description: 'Talks to Acme',
              auth: { type: 'api_key_header', headerName: 'X-Api-Key' },
              config: [
                {
                  name: 'baseUrl',
                  type: 'string',
                  required: true,
                  default: 'https://api.acme.com',
                },
              ],
              actions: {
                ping: {
                  description: 'Ping',
                  scope: 'read',
                  input: [],
                  request: { method: 'GET', url: '{{config.baseUrl}}/ping' },
                },
              },
            },
          })
        )
      );
    });
  });

  describe('logo', () => {
    const logoDataUri = 'data:image/png;base64,iVBORw0KGgo=';
    const typeLogoUrl = async (url: string) => {
      await userEvent.type(await screen.findByTestId('buildConnectorLogoUrlInput'), url);
    };

    beforeEach(() => {
      fetchConnectorTypeLogo.mockResolvedValue({ icon: logoDataUri });
    });

    it('loads nothing while typing, and flags a URL that is not http(s)', async () => {
      renderPage();

      await typeLogoUrl('ftp://example.com/logo.png');
      expect(fetchConnectorTypeLogo).not.toHaveBeenCalled();

      await userEvent.tab();
      expect(
        await screen.findByText('Enter an HTTP or HTTPS URL, or clear the field.')
      ).toBeInTheDocument();
      expect(fetchConnectorTypeLogo).not.toHaveBeenCalled();
    });

    it('loads the logo when the field loses focus, previews it and sends it', async () => {
      renderPage();

      await applyYaml(yamlDefinition);
      await typeLogoUrl('  https://cdn.example.com/logo.png ');
      expect(fetchConnectorTypeLogo).not.toHaveBeenCalled();
      await userEvent.tab();

      await waitFor(() =>
        expect(fetchConnectorTypeLogo).toHaveBeenCalledWith(
          expect.objectContaining({ url: 'https://cdn.example.com/logo.png' })
        )
      );
      const preview = await screen.findByTestId('buildConnectorLogoPreview');
      expect(preview.querySelector(`[data-euiicon-type="${logoDataUri}"]`)).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({ icon: logoDataUri }),
          })
        )
      );
      expect(fetchConnectorTypeLogo).toHaveBeenCalledTimes(1);
      expect(createConnectorType.mock.calls[0][0].connectorType).not.toHaveProperty('logoUrl');
    });

    it('loads the logo when a URL is pasted', async () => {
      renderPage();

      await userEvent.click(await screen.findByTestId('buildConnectorLogoUrlInput'));
      await userEvent.paste('https://cdn.example.com/logo.png');

      await screen.findByTestId('buildConnectorLogoPreview');
      expect(fetchConnectorTypeLogo).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://cdn.example.com/logo.png' })
      );
    });

    it('shows the server message when the logo cannot be loaded', async () => {
      fetchConnectorTypeLogo.mockRejectedValue({
        body: { message: 'The logo exceeds the 64 KB limit.' },
      });
      renderPage();

      await typeLogoUrl('https://cdn.example.com/huge.png');
      await userEvent.tab();

      expect(await screen.findByText('The logo exceeds the 64 KB limit.')).toBeInTheDocument();
      expect(screen.queryByTestId('buildConnectorLogoPreview')).not.toBeInTheDocument();
    });

    it('removes a loaded logo', async () => {
      renderPage();

      await typeLogoUrl('https://cdn.example.com/logo.png');
      await userEvent.tab();
      await screen.findByTestId('buildConnectorLogoPreview');

      await userEvent.click(screen.getByTestId('buildConnectorLogoRemoveButton'));

      await waitFor(() =>
        expect(screen.queryByTestId('buildConnectorLogoPreview')).not.toBeInTheDocument()
      );
      expect(screen.getByTestId('buildConnectorLogoUrlInput')).toHaveValue('');
    });

    it('loads a URL that was not loaded yet when saving', async () => {
      renderPage();

      await applyYaml(yamlDefinition);
      await typeLogoUrl('https://cdn.example.com/logo.png');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({ icon: logoDataUri }),
          })
        )
      );
    });

    it('does not save when the logo cannot be loaded on save', async () => {
      fetchConnectorTypeLogo.mockRejectedValue({ body: { message: 'Not an image.' } });
      renderPage();

      await applyYaml(yamlDefinition);
      await typeLogoUrl('https://cdn.example.com/logo.png');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(await screen.findByText('Not an image.')).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('imports a logo from the YAML and shows it', async () => {
      renderPage();

      await applyYaml(`${yamlDefinition.trimEnd()}\nicon: ${logoDataUri}\n`);

      const preview = await screen.findByTestId('buildConnectorLogoPreview');
      expect(preview.querySelector(`[data-euiicon-type="${logoDataUri}"]`)).toBeInTheDocument();
      expect(screen.getByTestId('buildConnectorLogoUrlInput')).toHaveValue('');

      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));
      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({ icon: logoDataUri }),
          })
        )
      );
    });

    it('flags an imported logo that is not a supported image', async () => {
      renderPage();

      await applyYaml(`${yamlDefinition.trimEnd()}\nicon: https://cdn.example.com/logo.png\n`);

      expect(
        await screen.findByText('Logo must be a base64 PNG, JPEG, GIF, WebP, SVG or ICO image.')
      ).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('imports several authentication types and sends them as a list', async () => {
      renderPage();

      await applyYaml(
        yamlDefinition.replace(
          /auth:[\s\S]*?config:/,
          `auth:
  types:
    - bearer
    - type: api_key_header
      defaults:
        headerField: X-Key
config:`
        )
      );

      expect(authCheckbox('Bearer token')).toBeChecked();
      expect(authCheckbox('API key header')).toBeChecked();
      expect(screen.getByTestId('buildConnectorAuthHeaderNameInput')).toHaveValue('X-Key');

      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({
              auth: {
                types: ['bearer', { type: 'api_key_header', defaults: { headerField: 'X-Key' } }],
              },
            }),
          })
        )
      );
    });

    it('requires at least one authentication type', async () => {
      renderPage();

      await removeAuthType('None');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(
        await screen.findByText('Select at least one authentication type.')
      ).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('requires the header name when API key header is selected', async () => {
      renderPage();

      await selectAuthType('API key header');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(await screen.findByText('Header name is required.')).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });
  });

  describe('string format', () => {
    const formatYaml = yamlDefinition.replace(
      `  - name: baseUrl
    type: string
    required: true`,
      `  - name: baseUrl
    type: string
    format: uri
    default: https://api.acme.com
    required: true`
    );

    it('imports a format and shows it only for string fields', async () => {
      renderPage();

      await applyYaml(formatYaml);

      expect(screen.getByTestId('buildConnectorConfigFields-0-format')).toHaveValue('uri');

      await userEvent.selectOptions(
        screen.getByTestId('buildConnectorConfigFields-0-type'),
        'number'
      );
      await waitFor(() =>
        expect(screen.queryByTestId('buildConnectorConfigFields-0-format')).not.toBeInTheDocument()
      );
    });

    it('sends the chosen format with the config field', async () => {
      renderPage();

      await applyYaml(formatYaml);
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({
              config: [
                {
                  name: 'baseUrl',
                  type: 'string',
                  format: 'uri',
                  default: 'https://api.acme.com',
                  required: true,
                },
              ],
            }),
          })
        )
      );
    });

    it('shows an error when the default does not match the format', async () => {
      renderPage();

      await applyYaml(formatYaml);
      await userEvent.clear(screen.getByTestId('buildConnectorConfigFields-0-default'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-0-default'), 'not a url');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(
        await screen.findByText('Default value must match the field format.')
      ).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });
  });

  describe('connection test (step 4)', () => {
    const testYaml = `${yamlDefinition.trimEnd()}
test:
  description: Checks the API is reachable
  request:
    method: GET
    url: "{{config.baseUrl}}"
    path: /health
    headers:
      X-Check: "yes"
`;

    it('is the fourth step and is empty by default', async () => {
      renderPage();

      const testStep = await screen.findByTestId('build-connector-page-step-test');
      expect(testStep).toHaveTextContent('Connection test');
      expect(within(testStep).getByTestId('buildConnectorTest-method')).toHaveValue('GET');
      expect(within(testStep).getByTestId('buildConnectorTest-url')).toHaveValue('');
      expect(within(testStep).getByTestId('buildConnectorTest-intro')).toHaveTextContent(
        'but not action input'
      );
    });

    it('does not send a test when it is left empty', async () => {
      renderPage();

      await applyYaml(yamlDefinition);
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() => expect(createConnectorType).toHaveBeenCalledTimes(1));
      expect(createConnectorType.mock.calls[0][0].connectorType).not.toHaveProperty('test');
    });

    it('fills the test from the YAML and sends it', async () => {
      renderPage();

      await applyYaml(testYaml);

      expect(screen.getByTestId('buildConnectorTest-description')).toHaveValue(
        'Checks the API is reachable'
      );
      expect(screen.getByTestId('buildConnectorTest-url')).toHaveValue('{{config.baseUrl}}');
      expect(screen.getByTestId('buildConnectorTest-path')).toHaveValue('/health');
      expect(screen.getByTestId('buildConnectorTest-headers-0-key')).toHaveValue('X-Check');

      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({
              test: {
                description: 'Checks the API is reachable',
                request: {
                  method: 'GET',
                  url: '{{config.baseUrl}}',
                  path: '/health',
                  headers: { 'X-Check': 'yes' },
                },
              },
            }),
          })
        )
      );
    });

    it('builds a test in the form, including a JSON body', async () => {
      renderPage();

      await applyYaml(yamlDefinition);
      await userEvent.selectOptions(screen.getByTestId('buildConnectorTest-method'), 'POST');
      await userEvent.type(
        screen.getByTestId('buildConnectorTest-url'),
        'https://acme.example.com'
      );
      fireEvent.change(
        within(screen.getByTestId('buildConnectorTest-body')).getByTestId('mockedCodeEditor'),
        { target: { value: '{"ping": true}' } }
      );
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({
              test: {
                request: {
                  method: 'POST',
                  url: 'https://acme.example.com',
                  body: { ping: true },
                },
              },
            }),
          })
        )
      );
    });

    it('requires a URL once any test field is filled in', async () => {
      renderPage();

      await applyYaml(yamlDefinition);
      await userEvent.type(screen.getByTestId('buildConnectorTest-description'), 'Only a note');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(
        await within(screen.getByTestId('build-connector-page-step-test')).findByText(
          'URL is required.'
        )
      ).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('cannot reference action input', async () => {
      renderPage();

      await applyYaml(yamlDefinition);
      await userEvent.type(screen.getByTestId('buildConnectorTest-url'), '{{{{input.message}}');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      expect(await screen.findByTestId('buildConnectorTest-request-error')).toHaveTextContent(
        'Template reference "input.message" is not declared for this connector test.'
      );
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('rejects unknown keys in the test YAML', async () => {
      renderPage();

      await typeYaml(`${yamlDefinition.trimEnd()}\ntest:\n  url: https://x.example.com\n`);

      expect(
        await screen.findByText(
          '"test" has an unknown key "url". Allowed keys: description, request.'
        )
      ).toBeInTheDocument();
    });

    it('flags the step after a failed save', async () => {
      renderPage();

      await applyYaml(yamlDefinition);
      await userEvent.type(screen.getByTestId('buildConnectorTest-description'), 'Only a note');
      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await within(screen.getByTestId('build-connector-page-step-test')).findByText(
        'URL is required.'
      );
      expect(screen.getByTestId('build-connector-page-step-test')).toHaveTextContent(/has errors/);
      expect(screen.getByTestId('build-connector-page-step-config')).not.toHaveTextContent(
        /has errors/
      );
    });
  });

  it('rejects an invalid ID format', async () => {
    renderPage();

    await userEvent.type(await screen.findByTestId('buildConnectorIdInput'), 'No Dot');
    await userEvent.tab();

    expect(
      await screen.findByText('Use only lowercase letters, numbers, "_" and "-".')
    ).toBeInTheDocument();
  });

  describe('layout', () => {
    it('offers defined config fields and params as request variables', async () => {
      renderPage();

      await userEvent.click(await screen.findByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-0-name'), 'baseUrl');
      await userEvent.click(screen.getByTestId('buildConnectorAction-0-input-add'));
      await userEvent.type(screen.getByTestId('buildConnectorAction-0-input-0-name'), 'title');

      const variables = screen.getByTestId('buildConnectorAction-0-variables');
      expect(variables).toHaveTextContent('{{config.baseUrl}}');
      expect(variables).toHaveTextContent('{{input.title}}');
      expect(screen.getByTestId('buildConnectorTest-variables')).toHaveTextContent(
        '{{config.baseUrl}}'
      );
      expect(screen.getByTestId('buildConnectorTest-variables')).not.toHaveTextContent('input.');
    });

    it('summarizes an action in its header and collapses all actions', async () => {
      renderPage();

      expect(screen.queryByTestId('buildConnectorActions-toggleAll')).not.toBeInTheDocument();
      await userEvent.type(await screen.findByTestId('buildConnectorAction-0-name'), 'create_post');
      expect(screen.getByTestId('buildConnectorAction-0-toggle')).toHaveTextContent('create_post');
      expect(screen.getByTestId('buildConnectorAction-0-toggle')).toHaveTextContent('POST');

      await userEvent.click(screen.getByTestId('buildConnectorActions-add'));
      const toggleAll = screen.getByTestId('buildConnectorActions-toggleAll');
      expect(toggleAll).toHaveTextContent('Collapse all');

      await userEvent.click(toggleAll);
      expect(toggleAll).toHaveTextContent('Expand all');
    });

    it('opens collapsed actions with errors and sums up invalid steps on save', async () => {
      renderPage();

      await userEvent.click(await screen.findByTestId('buildConnectorActions-add'));
      await userEvent.click(screen.getByTestId('buildConnectorActions-toggleAll'));
      expect(screen.getByTestId('buildConnectorActions-toggleAll')).toHaveTextContent('Expand all');

      await userEvent.click(screen.getByTestId('build-connector-page-save-btn'));

      await waitFor(() =>
        expect(screen.getByTestId('buildConnectorActions-toggleAll')).toHaveTextContent(
          'Collapse all'
        )
      );
      expect(screen.getByTestId('build-connector-page-error-summary')).toHaveTextContent(
        'need attention before saving'
      );
    });
  });
});
