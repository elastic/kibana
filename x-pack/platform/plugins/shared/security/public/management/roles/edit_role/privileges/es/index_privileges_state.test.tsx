/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';

import '@kbn/code-editor-mock/jest_helper';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { IndexPrivileges } from './index_privileges';
import type { Role } from '../../../../../../common';
import { licenseMock } from '../../../../../../common/licensing/index.mock';
import { copyRole } from '../../../../../../common/model';
import { indicesAPIClientMock } from '../../../index.mock';
import { RoleValidator } from '../../validate_role';

const renderEditor = (initialRole: Role, indexType: 'indices' | 'remote_indices' = 'indices') => {
  const onChange = jest.fn<void, [Role]>();
  const license = licenseMock.create();
  license.getFeatures.mockReturnValue({
    ...license.getFeatures(),
    allowRoleFieldLevelSecurity: true,
    allowRoleDocumentLevelSecurity: true,
    allowRoleRemoteIndexPrivileges: true,
  });
  const indicesAPIClient = indicesAPIClientMock.create();
  indicesAPIClient.getFields.mockResolvedValue([]);
  const Editor = () => {
    const [role, setRole] = useState(initialRole);
    return (
      <>
        <button onClick={() => setRole(copyRole(role))}>Copy draft</button>
        <IndexPrivileges
          role={role}
          indexType={indexType}
          license={license}
          validator={new RoleValidator()}
          availableIndexPrivileges={['read']}
          indicesAPIClient={indicesAPIClient}
          onChange={(updatedRole) => {
            onChange(updatedRole);
            setRole(updatedRole);
          }}
        />
      </>
    );
  };
  render(
    <I18nProvider>
      <KibanaContextProvider services={coreMock.createStart()}>
        <Editor />
      </KibanaContextProvider>
    </I18nProvider>
  );
  return onChange;
};

describe('index privilege form state', () => {
  it.each(['indices', 'remote_indices'] as const)(
    'keeps disabled DLS/FLS values with the surviving %s entry after deletion',
    async (indexType) => {
      const entries = [
        {
          names: ['first'],
          privileges: ['read'],
          clusters: ['remote'],
          query: '{"term":{"owner":"first"}}',
          field_security: { grant: ['first.*'] },
        },
        {
          names: ['second'],
          privileges: ['read'],
          clusters: ['remote'],
          query: '{"term":{"owner":"second"}}',
          field_security: { grant: ['second.*'] },
        },
      ];
      const role: Role = {
        name: 'role',
        kibana: [],
        elasticsearch: { cluster: [], run_as: [], indices: [], [indexType]: entries },
      };
      const onChange = renderEditor(role, indexType);
      fireEvent.click(screen.getByTestId('restrictDocumentsQuery1'));
      fireEvent.click(screen.getByTestId('restrictFieldsQuery1'));
      fireEvent.click(screen.getByRole('button', { name: 'Copy draft' }));
      fireEvent.click(
        screen.getAllByRole('button', {
          name:
            indexType === 'indices' ? 'Delete index privilege' : 'Delete remote index privilege',
        })[0]
      );
      expect(screen.getByTestId('restrictDocumentsQuery0')).not.toBeChecked();
      expect(screen.getByTestId('restrictFieldsQuery0')).not.toBeChecked();
      fireEvent.click(screen.getByTestId('restrictDocumentsQuery0'));
      fireEvent.click(screen.getByTestId('restrictFieldsQuery0'));
      expect(onChange).toHaveBeenLastCalledWith({
        ...role,
        elasticsearch: {
          ...role.elasticsearch,
          [indexType]: [{ ...entries[1], field_security: { grant: ['second.*'], except: [] } }],
        },
      });
      await act(async () => {});
    }
  );

  it('shows an empty field grant as restricted and preserves it across toggles', async () => {
    const entry = { names: ['logs'], privileges: ['read'], field_security: { grant: [] } };
    const role: Role = {
      name: 'role',
      kibana: [],
      elasticsearch: { cluster: [], run_as: [], indices: [entry] },
    };
    const onChange = renderEditor(role);
    expect(screen.getByTestId('restrictFieldsQuery0')).toBeChecked();
    fireEvent.click(screen.getByTestId('restrictFieldsQuery0'));
    expect(onChange).toHaveBeenLastCalledWith({
      ...role,
      elasticsearch: {
        ...role.elasticsearch,
        indices: [{ ...entry, field_security: { grant: ['*'], except: [] } }],
      },
    });
    fireEvent.click(screen.getByTestId('restrictFieldsQuery0'));
    expect(screen.getByTestId('restrictFieldsQuery0')).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith({
      ...role,
      elasticsearch: {
        ...role.elasticsearch,
        indices: [{ ...entry, field_security: { grant: [], except: [] } }],
      },
    });
    await act(async () => {});
  });

  it('starts unrestricted when field security is absent', () => {
    renderEditor({
      name: 'role',
      kibana: [],
      elasticsearch: {
        cluster: [],
        run_as: [],
        indices: [{ names: ['logs'], privileges: ['read'] }],
      },
    });
    expect(screen.getByTestId('restrictFieldsQuery0')).not.toBeChecked();
  });
});
