/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedGraphEnvironment } from './mocks';
import { createMockGraphStore } from './mocks';
import { registerFieldsListeners, updateFieldProperties } from './fields';
import type { WorkspaceField, WorkspaceNode } from '../types';
import { loadTemplates, registerUrlTemplatesListeners } from './url_templates';

/**
 * This suite tests listeners that only exist to sync the legacy world
 * with the redux state management. They can be discarded once everything is
 * migrated.
 */
describe('legacy sync listeners', () => {
  let env: MockedGraphEnvironment;

  beforeEach(() => {
    env = createMockGraphStore({
      listeners: [registerFieldsListeners, registerUrlTemplatesListeners],
      initialStateOverwrites: {
        fields: {
          field1: {
            name: 'field1',
            color: 'black',
          } as WorkspaceField,
        },
      },
    });
    env.mockedDeps.getWorkspace()!.nodes.push({
      color: 'pink',
      data: {
        field: 'field1',
        term: 'A',
      },
      icon: {
        id: 'a',
        package: 'eui',
        label: '',
        prevName: 'a',
      },
    } as WorkspaceNode);
    env.mockedDeps.getWorkspace()!.nodes.push({
      color: 'pink',
      data: {
        field: 'field2',
        term: 'B',
      },
      icon: {
        id: 'b',
        package: 'eui',
        label: '',
        prevName: 'b',
      },
    } as WorkspaceNode);
  });

  it('syncs templates with workspace', () => {
    env.store.dispatch(loadTemplates([]));
    expect(env.mockedDeps.notifyReact).toHaveBeenCalled();
  });

  it('syncs styles with nodes', () => {
    env.store.dispatch(
      updateFieldProperties({
        fieldName: 'field1',
        fieldProperties: {
          color: 'red',
          icon: {
            id: 'x',
            package: 'eui',
            label: '',
            prevName: 'x',
          },
        },
      })
    );
    const workspace = env.mockedDeps.getWorkspace()!;
    expect(workspace.nodes[0].color).toEqual('red');
    expect(workspace.nodes[0].icon.id).toEqual('x');
    expect(workspace.nodes[1].color).toEqual('pink');
    expect(workspace.nodes[1].icon.id).toEqual('b');
  });
});
