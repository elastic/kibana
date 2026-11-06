/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema } from '../document_schema';
import {
  A2UI_VERSION,
  CUSTOM_APP_CATALOG_ID,
  createCustomAppCatalog,
  fromA2uiMessages,
  toA2uiMessages,
  type A2uiComponent,
  type A2uiMessage,
} from '.';

const document = appDocumentSchema.parse({
  state: {
    service: { type: 'string', default: 'checkout' },
    look: { type: 'string', default: 'teal' },
    show: { type: 'boolean', default: true },
    users: { type: 'list', default: [] },
    limit: { type: 'number', default: 10 },
    sev: { type: 'string', default: 'success' },
    note: { type: 'string', default: '' },
    view: { type: 'string', default: 'summary' },
  },
  theme: { accent: { $state: 'look' }, shape: 'soft' },
  root: {
    type: 'stack',
    id: 'root',
    children: [
      { type: 'heading', id: 'title', text: 'Hello {{state.service}}' },
      {
        type: 'select',
        id: 'pick',
        label: 'Service',
        bind: 'service',
        options: [{ value: 'checkout' }, { value: 'cart' }],
        optionsQuery: 'FROM logs | STATS BY service.name',
        onChange: [{ type: 'setState', key: 'note', value: { fromInput: true } }],
      },
      { type: 'text', id: 'intro', text: '**Hi** there' },
      { type: 'search', id: 'find', label: 'Find', bind: 'note', placeholder: 'Type' },
      { type: 'switch', id: 'flag', label: 'Show', bind: 'show' },
      {
        type: 'stack',
        id: 'bar',
        direction: 'horizontal',
        children: [
          {
            type: 'button',
            id: 'go',
            label: 'Go',
            onClick: [{ type: 'openFlyout', flyout: 'more' }],
          },
          { type: 'button', id: 'idle', label: 'Nothing' },
        ],
      },
      {
        type: 'callout',
        id: 'details',
        title: 'Costs ${5} for {{state.service}}',
        visibleWhen: { $state: 'view', equals: 'details' },
      },
      {
        type: 'card',
        id: 'card',
        title: 'Card',
        visibleWhen: { $state: 'show' },
        children: [
          { type: 'badge', id: 'badge', text: 'ok', color: { $state: 'sev' } },
          { type: 'progress', id: 'budget', query: 'ROW a = 1', max: { $state: 'limit' } },
        ],
      },
      {
        type: 'tabs',
        id: 'tabs',
        children: [
          {
            type: 'section',
            id: 'one',
            label: 'One',
            children: [
              {
                type: 'table',
                id: 'rows',
                query: 'FROM logs | WHERE s == ?service',
                onRowClick: [
                  { type: 'setState', key: 'service', value: { fromColumn: 'service' } },
                  { type: 'openFlyout', flyout: 'more' },
                ],
              },
              {
                type: 'chart',
                id: 'trend',
                query: 'FROM logs | STATS c = COUNT(*) BY h = DATE_TRUNC(1 hour, @timestamp)',
                annotations: { query: 'FROM d', time: 't', visible: { $state: 'show' } },
              },
            ],
          },
        ],
      },
      {
        type: 'form',
        id: 'ask',
        submitLabel: 'Send',
        fields: [{ kind: 'text', bind: 'note', label: 'Note' }],
        onSubmit: [
          { type: 'runWorkflow', workflow: 'notify', inputs: { note: { fromState: 'note' } } },
        ],
      },
      { type: 'flyout', id: 'more', title: 'More', children: [] },
    ],
  },
});

const components = (messages: A2uiMessage[]): A2uiComponent[] =>
  messages.flatMap((message) =>
    'updateComponents' in message ? message.updateComponents.components : []
  );

describe('a document as A2UI messages', () => {
  const messages = toA2uiMessages(document);

  it('makes a surface of the catalog, with its values as the data model, and its components', () => {
    expect(
      messages.map((message) => Object.keys(message).filter((key) => key !== 'version')[0])
    ).toEqual(['createSurface', 'updateDataModel', 'updateComponents']);
    expect(messages.every((message) => message.version === A2UI_VERSION)).toBe(true);
    expect(messages[0]).toMatchObject({
      createSurface: {
        catalogId: CUSTOM_APP_CATALOG_ID,
        theme: { accent: { path: '/look' }, shape: 'soft' },
      },
    });
    expect(messages[1]).toMatchObject({
      updateDataModel: {
        path: '/',
        value: { service: 'checkout', look: 'teal', show: true, users: [], limit: 10 },
      },
    });
  });

  it('lists the components at one level, by id, with the first as root and each container naming its children', () => {
    const list = components(messages);
    const byId = Object.fromEntries(list.map((component) => [component.id, component]));

    expect(list[0]).toMatchObject({ id: 'root', component: 'Column' });
    expect(byId.root.children).toEqual([
      'title',
      'pick',
      'intro',
      'find',
      'flag',
      'bar',
      'details',
      'card',
      'tabs',
      'ask',
      'more',
    ]);
    expect(byId.bar).toMatchObject({ component: 'Row', children: ['go', 'idle'] });
  });

  it('uses the components of the basic catalog where a node means the same', () => {
    const byId = Object.fromEntries(
      components(messages).map((component) => [component.id, component])
    );

    // A stack is a column, or a row; a heading is a text of a heading's size, and a text is a body.
    expect(byId.root.component).toBe('Column');
    expect(byId.bar.component).toBe('Row');
    expect(byId.title).toMatchObject({ component: 'Text', variant: 'h3' });
    expect(byId.intro).toMatchObject({ component: 'Text', variant: 'body', text: '**Hi** there' });
    // A switch is a check box, and a search is a text field.
    expect(byId.flag).toMatchObject({
      component: 'CheckBox',
      label: 'Show',
      value: { path: '/show' },
    });
    expect(byId.find).toMatchObject({
      component: 'TextField',
      variant: 'shortText',
      value: { path: '/note' },
      placeholder: 'Type',
    });
    // A button has a component for what it says, and always an action.
    expect(byId.go).toMatchObject({
      component: 'Button',
      child: 'go-label',
      action: { functionCall: { call: 'openFlyout', args: { flyout: 'more' } } },
    });
    expect(byId['go-label']).toMatchObject({ component: 'Text', text: 'Go' });
    expect(byId.idle.action).toEqual({ functionCall: { call: 'sequence', args: { actions: [] } } });
    // A card holds one component, which is a column of what it holds; tabs hold a column each.
    expect(byId.card).toMatchObject({ component: 'Card', child: 'card-body', title: 'Card' });
    expect(byId['card-body']).toMatchObject({ component: 'Column', children: ['badge', 'budget'] });
    expect(byId.tabs).toMatchObject({ component: 'Tabs', tabs: [{ title: 'One', child: 'one' }] });
    expect(byId.one).toMatchObject({ component: 'Column', children: ['rows', 'trend'] });
    // What has no component of the basic catalog keeps a name of its own.
    expect(byId.pick.component).toBe('Select');
    expect(byId.rows.component).toBe('Table');
  });

  it('binds an input to a value by a path, and a property that reads a value by one too', () => {
    const byId = Object.fromEntries(
      components(messages).map((component) => [component.id, component])
    );

    expect(byId.pick).toMatchObject({ component: 'Select', value: { path: '/service' } });
    expect(byId.pick).not.toHaveProperty('bind');
    expect(byId.badge.color).toEqual({ path: '/sev' });
    expect(byId.budget.max).toEqual({ path: '/limit' });
    expect(byId.card.visibleWhen).toEqual({ path: '/show' });
    expect(byId.trend.annotations).toMatchObject({ visible: { path: '/show' } });
    expect(byId.ask.fields).toEqual([{ kind: 'text', label: 'Note', value: { path: '/note' } }]);
  });

  it('writes what happens as the one action that A2UI allows: a function call, or a sequence of them', () => {
    const byId = Object.fromEntries(
      components(messages).map((component) => [component.id, component])
    );

    expect(byId.rows.onRowClick).toEqual({
      functionCall: {
        call: 'sequence',
        args: {
          actions: [
            { call: 'setState', args: { key: 'service', value: { fromColumn: 'service' } } },
            { call: 'openFlyout', args: { flyout: 'more' } },
          ],
        },
      },
    });
    expect(byId.pick.onChange).toEqual({
      functionCall: { call: 'setState', args: { key: 'note', value: { fromInput: true } } },
    });
    // Nothing happens when nothing is asked, so there is no property for it.
    expect(byId.flag).not.toHaveProperty('onChange');
  });

  it('writes the values in a text as formatString does, and keeps a literal ${ as it is', () => {
    const byId = Object.fromEntries(
      components(messages).map((component) => [component.id, component])
    );

    expect(byId.title.text).toEqual({
      call: 'formatString',
      args: { value: 'Hello ${/service}' },
      returnType: 'string',
    });
    expect(byId.details.title).toEqual({
      call: 'formatString',
      args: { value: 'Costs \\${5} for ${/service}' },
      returnType: 'string',
    });
    // A text with no value in it is a literal, as A2UI writes it.
    expect(byId.card.title).toBe('Card');
  });

  it('writes when a component is shown as a boolean: a path, or a comparison', () => {
    const byId = Object.fromEntries(
      components(messages).map((component) => [component.id, component])
    );

    expect(byId.card.visibleWhen).toEqual({ path: '/show' });
    expect(byId.details.visibleWhen).toEqual({
      call: 'equals',
      args: { a: { path: '/view' }, b: 'details' },
      returnType: 'boolean',
    });
  });

  it('is the same document when it is read back', () => {
    const result = fromA2uiMessages(messages);

    expect(result).toEqual({ ok: true, document });
  });

  it('survives being sent as text', () => {
    const result = fromA2uiMessages(JSON.parse(JSON.stringify(messages)));

    expect(result).toEqual({ ok: true, document });
  });
});

describe('messages as a document', () => {
  const surface = (extra: unknown[]) =>
    [
      {
        version: A2UI_VERSION,
        createSurface: { surfaceId: 's', catalogId: CUSTOM_APP_CATALOG_ID },
      },
      ...extra,
    ] as A2uiMessage[];
  const withComponents = (list: unknown[]) =>
    surface([
      { version: A2UI_VERSION, updateDataModel: { surfaceId: 's', path: '/', value: {} } },
      { version: A2UI_VERSION, updateComponents: { surfaceId: 's', components: list } },
    ]);

  it('says when there is no surface, or it is of a catalog this app does not know', () => {
    expect(fromA2uiMessages([])).toEqual({
      ok: false,
      errors: ['There is no createSurface message.'],
    });
    expect(
      fromA2uiMessages([
        {
          version: A2UI_VERSION,
          createSurface: { surfaceId: 's', catalogId: 'https://example.com/basic.json' },
        },
      ])
    ).toEqual({
      ok: false,
      errors: ['The catalog "https://example.com/basic.json" is not one this app knows.'],
    });
  });

  it('says when a component is used and not defined, or used twice', () => {
    expect(
      fromA2uiMessages(withComponents([{ id: 'root', component: 'Column', children: ['ghost'] }]))
    ).toEqual({ ok: false, errors: ['The component "ghost" is used and not defined.'] });

    expect(
      fromA2uiMessages(
        withComponents([
          { id: 'root', component: 'Column', children: ['a', 'a'] },
          { id: 'a', component: 'Text', variant: 'h3', text: 'x' },
        ])
      )
    ).toEqual({ ok: false, errors: ['The component "a" is used more than once.'] });
  });

  it('checks the document as any other is, and says what is wrong', () => {
    const result = fromA2uiMessages(
      withComponents([
        { id: 'root', component: 'Column', children: ['b'] },
        { id: 'b', component: 'Badge', text: 'x', color: 'magenta' },
      ])
    );

    expect(result.ok).toBe(false);
  });
});

describe('messages written as the basic catalog writes them', () => {
  const messages = (list: unknown[], model: unknown = {}) =>
    [
      {
        version: A2UI_VERSION,
        createSurface: { surfaceId: 's', catalogId: CUSTOM_APP_CATALOG_ID },
      },
      { version: A2UI_VERSION, updateDataModel: { surfaceId: 's', path: '/', value: model } },
      { version: A2UI_VERSION, updateComponents: { surfaceId: 's', components: list } },
    ] as A2uiMessage[];

  it('are the nodes they mean: a column, a title of any size, a button with what it says, a card, tabs', () => {
    const result = fromA2uiMessages(
      messages(
        [
          {
            id: 'root',
            component: 'Column',
            children: ['t', 'b', 'c', 'tabs', 'box', 'field'],
            justify: 'center',
          },
          { id: 't', component: 'Text', variant: 'h1', text: 'Big title' },
          {
            id: 'b',
            component: 'Button',
            child: 'b-text',
            action: { functionCall: { call: 'closeFlyout', args: {} } },
          },
          { id: 'b-text', component: 'Text', text: 'Close' },
          { id: 'c', component: 'Card', child: 'c-text' },
          { id: 'c-text', component: 'Text', variant: 'body', text: 'Inside the card' },
          { id: 'tabs', component: 'Tabs', tabs: [{ title: 'First', child: 'first-text' }] },
          { id: 'first-text', component: 'Text', text: 'In the tab' },
          { id: 'box', component: 'CheckBox', label: 'On', value: { path: '/on' } },
          { id: 'field', component: 'TextField', label: 'Name', value: { path: '/name' } },
        ],
        { on: true, name: '' }
      )
    );

    expect(result.ok).toBe(true);
    const root = (result.ok ? result.document.root : undefined) as unknown as {
      children: Array<Record<string, unknown>>;
    };
    expect(root.children.map(({ type }) => type)).toEqual([
      'heading',
      'button',
      'card',
      'tabs',
      'switch',
      'search',
    ]);
    expect(root.children[1]).toMatchObject({ label: 'Close', onClick: [{ type: 'closeFlyout' }] });
    expect(root.children[2]).toMatchObject({
      children: [{ type: 'text', text: 'Inside the card' }],
    });
    expect(root.children[3]).toMatchObject({
      children: [{ type: 'section', label: 'First', children: [{ type: 'text' }] }],
    });
    expect(root.children[4]).toMatchObject({ bind: 'on' });
    expect(root.children[5]).toMatchObject({ bind: 'name' });
  });

  it('say what this app does not draw, instead of drawing it wrongly', () => {
    const errors = (result: ReturnType<typeof fromA2uiMessages>) =>
      result.ok ? [] : result.errors;

    expect(
      errors(
        fromA2uiMessages(
          messages(
            [
              { id: 'root', component: 'Column', children: ['f'] },
              {
                id: 'f',
                component: 'TextField',
                label: 'Pin',
                variant: 'obscured',
                value: { path: '/pin' },
              },
            ],
            { pin: '' }
          )
        )
      )
    ).toEqual(['The text field "f" is of the kind "obscured", which this app does not draw.']);

    expect(
      errors(
        fromA2uiMessages(
          messages(
            [
              { id: 'root', component: 'Column', children: ['b'] },
              {
                id: 'b',
                component: 'Button',
                child: 'l',
                action: { functionCall: { call: 'closeFlyout' } },
              },
              { id: 'l', component: 'Text', text: { path: '/label' } },
            ],
            { label: 'x' }
          )
        )
      )
    ).toEqual(['The button "b" needs a text that is written, not one that reads values.']);

    expect(
      errors(
        fromA2uiMessages(
          messages([
            { id: 'root', component: 'Column', children: { componentId: 'x', path: '/items' } },
          ])
        )
      )
    ).toEqual([
      'The component "root" lists its children by a template, which this app does not draw.',
    ]);
  });
});

describe('the catalog', () => {
  const catalog = createCustomAppCatalog();
  it('is named, with its components and functions, and the theme in its definitions', () => {
    expect(catalog).toMatchObject({ catalogId: CUSTOM_APP_CATALOG_ID });
    expect(Object.keys(catalog.components as object)).toEqual(
      expect.arrayContaining([
        'Column',
        'Row',
        'Text',
        'CheckBox',
        'TextField',
        'Button',
        'Card',
        'Tabs',
        'Table',
        'Chart',
        'Select',
        'Section',
      ])
    );
    expect(Object.keys(catalog.functions as object).sort()).toEqual(
      [
        'closeFlyout',
        'equals',
        'formatString',
        'openFlyout',
        'runWorkflow',
        'sequence',
        'setState',
      ].sort()
    );
    expect((catalog.$defs as Record<string, unknown>).theme).toBeDefined();
  });

  const defs = catalog.$defs as Record<string, { oneOf?: Array<{ $ref: string }> }>;
  const componentSchemas = catalog.components as Record<
    string,
    { allOf: Array<{ properties?: Record<string, unknown> }> }
  >;

  it('is in the shape of the specification: the common types by reference, and the lists of what a surface may use', () => {
    expect(catalog.catalogId).toBe(catalog.$id);
    expect(Object.keys(defs).sort()).toEqual(
      ['CatalogComponentCommon', 'anyComponent', 'anyFunction', 'theme'].sort()
    );
    expect(
      defs.anyComponent.oneOf?.map(({ $ref }) => $ref.replace('#/components/', '')).sort()
    ).toEqual(Object.keys(componentSchemas).sort());
    expect(
      defs.anyFunction.oneOf?.map(({ $ref }) => $ref.replace('#/functions/', '')).sort()
    ).toEqual(Object.keys(catalog.functions as object).sort());
    expect(JSON.stringify(componentSchemas.Column.allOf[0])).toContain(
      'common_types.json#/$defs/ComponentCommon'
    );
  });

  it('declares every property of every component that a document is converted to, which the specification asks, as no other is allowed', () => {
    const common = ['id', 'component', 'children', 'accessibility', 'weight', 'visibleWhen'];

    components(toA2uiMessages(document)).forEach((component) => {
      const schema = componentSchemas[component.component];
      expect(schema).toBeDefined();
      const declared = Object.keys(schema.allOf[2].properties ?? {});
      const unknown = Object.keys(component).filter(
        (key) => !declared.includes(key) && !common.includes(key)
      );
      expect([component.id, unknown]).toEqual([component.id, []]);
    });
  });

  it('writes a value that can be read, and an action, with the types of the specification', () => {
    const properties = (name: string) => componentSchemas[name].allOf[2].properties ?? {};

    expect(JSON.stringify(properties('Badge').color)).toContain(
      'common_types.json#/$defs/DataBinding'
    );
    expect(JSON.stringify(properties('Badge').color)).toContain(
      'common_types.json#/$defs/FunctionCall'
    );
    expect(properties('Select').value).toEqual({ $ref: expect.stringContaining('DataBinding') });
    expect(properties('Text').text).toEqual({ $ref: expect.stringContaining('DynamicString') });
    expect(properties('Table').onRowClick).toEqual({ $ref: expect.stringContaining('Action') });
  });
});
