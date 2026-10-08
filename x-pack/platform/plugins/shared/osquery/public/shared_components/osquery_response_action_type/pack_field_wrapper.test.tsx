/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';

import { PackFieldWrapper } from './pack_field_wrapper';
import { usePacks } from '../../packs/use_packs';

jest.mock('../../packs/use_packs');
jest.mock('../../live_queries/form/packs_combobox_field', () => ({
  PacksComboBoxField: () => null,
}));

// Captured as a spy rather than stubbed out: the point of these assertions is
// *which* query set the wrapper hands down, which is invisible from the DOM.
const mockPackQueriesStatusTable = jest.fn((_props: Record<string, unknown>) => null);
jest.mock('../../live_queries/form/pack_queries_status_table', () => ({
  PackQueriesStatusTable: (props: Record<string, unknown>) => mockPackQueriesStatusTable(props),
}));

const usePacksMock = usePacks as jest.MockedFunction<typeof usePacks>;

const PACK_ID = 'pack-1';
// The find-packs route returns `queries` as an array, unlike the read-pack route.
const PACK_LIST_QUERIES = [{ id: 'list-query', query: 'select * from uptime;' }];

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const hooksForm = useForm({ defaultValues: { packId: [PACK_ID] } });

  return <FormProvider {...hooksForm}>{children}</FormProvider>;
};

const renderWrapper = (props: Parameters<typeof PackFieldWrapper>[0] = {}) =>
  render(
    <Wrapper>
      <PackFieldWrapper {...props} />
    </Wrapper>
  );

describe('PackFieldWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePacksMock.mockReturnValue({
      data: { total: 1, data: [{ saved_object_id: PACK_ID, queries: PACK_LIST_QUERIES }] },
    } as unknown as ReturnType<typeof usePacks>);
  });

  it('previews the selected pack from the packs list when no details are supplied', () => {
    renderWrapper();

    expect(mockPackQueriesStatusTable).toHaveBeenCalledWith(
      expect.objectContaining({ data: PACK_LIST_QUERIES })
    );
  });

  it('renders the supplied queries instead of the packs list', () => {
    const queries = [{ id: 'form-query', query: 'select * from processes;' }];

    renderWrapper({ liveQueryDetails: { action_id: 'action-1', queries } });

    expect(mockPackQueriesStatusTable).toHaveBeenCalledWith(
      expect.objectContaining({ data: queries })
    );
  });

  it('renders no table while the supplied queries are still empty', () => {
    // The response action form supplies the form value that the rule will
    // persist: showing the packs list here would advertise queries the save is
    // not going to include.
    renderWrapper({ liveQueryDetails: { queries: [] } });

    expect(mockPackQueriesStatusTable).not.toHaveBeenCalled();
  });
});
