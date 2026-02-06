/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { renderWithTestingProviders } from '../../../common/mock';
import { MockFormWrapperComponent } from '../test_utils';
import { AdditionalFormFields } from './additional_form_fields';
import { useGetFields } from './use_get_fields';
import { useGetFieldsResponse } from './mocks';

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_fields');

const useGetFieldsMock = useGetFields as jest.Mock;

describe('AdditionalFormFields', () => {
  beforeEach(() => {
    useGetFieldsMock.mockReturnValue(useGetFieldsResponse);
  });

  it('renders the correct fields', async () => {
    renderWithTestingProviders(
      <MockFormWrapperComponent>
        <UseField
          path="fields.additionalFields"
          component={AdditionalFormFields}
          componentProps={{
            isInSidebarForm: false,
            connector: {
              id: 'resilient-1',
              name: 'Resilient',
              connector_type_id: '.resilient',
            },
          }}
        />
      </MockFormWrapperComponent>
    );

    const comboBox = screen.getByTestId('comboBoxSearchInput');

    await userEvent.click(comboBox);

    expect(screen.getByText('Description')).toBeInTheDocument();
    fireEvent.change(comboBox, { target: { value: 'Resolution' } });
    expect(screen.getByText('Resolution summary')).toBeInTheDocument();
  });

  it('does not include read-only or hidden fields', async () => {
    const readOnlyDescriptionField = {
      name: 'read_only_description',
      value: 'read_only_description',
      text: 'Description (read-only)',
      label: 'Description (read-only)',
      input_type: 'text',
      read_only: true,
    };
    const descriptionField = {
      name: 'description',
      value: 'description',
      text: 'Description (not read-only)',
      label: 'Description (not read-only)',
      input_type: 'text',
      read_only: false,
    };
    const severityField = {
      name: 'severity_code',
      value: 'severity_code',
      text: 'Severity Required',
      label: 'Severity Required',
      input_type: 'text',
      read_only: false,
    };
    const incidentTypeField = {
      name: 'incident_type_ids',
      value: 'incident_type_ids',
      text: 'Incident Types Required',
      label: 'Incident Types Required',
      input_type: 'text',
      read_only: false,
    };

    useGetFieldsMock.mockReturnValue({
      ...useGetFieldsResponse,
      data: {
        data: {
          ...useGetFieldsResponse.data.data,
          fields: [readOnlyDescriptionField, descriptionField, severityField, incidentTypeField],
          fieldsObj: {
            read_only_description: readOnlyDescriptionField,
            description: descriptionField,
            severity_code: severityField,
            incident_type_ids: incidentTypeField,
          },
        },
      },
    });

    renderWithTestingProviders(
      <MockFormWrapperComponent>
        <UseField
          path="fields.additionalFields"
          component={AdditionalFormFields}
          componentProps={{
            isInSidebarForm: false,
            connector: {
              id: 'resilient-1',
              name: 'Resilient',
              connector_type_id: '.resilient',
            },
          }}
        />
      </MockFormWrapperComponent>
    );

    const comboBox = screen.getByTestId('comboBoxSearchInput');

    await userEvent.click(comboBox);

    fireEvent.change(comboBox, { target: { value: 'Severity' } });
    expect(screen.queryByText('Severity Required')).not.toBeInTheDocument();
    fireEvent.change(comboBox, { target: { value: 'Incident' } });
    expect(screen.queryByText('Incident Types Required')).not.toBeInTheDocument();
    fireEvent.change(comboBox, { target: { value: 'Description' } });
    expect(screen.queryByText('Description (read-only)')).not.toBeInTheDocument();
    expect(screen.getByText('Description (not read-only)')).toBeInTheDocument();
  });
});
