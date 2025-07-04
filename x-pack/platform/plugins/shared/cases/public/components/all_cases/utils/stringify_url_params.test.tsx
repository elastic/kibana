/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components';
import { DEFAULT_CASES_TABLE_STATE } from '../../../containers/constants';
import { CaseSeverity } from '../../../../common';
import { SortFieldCase } from '../../../../common/ui';
import { stringifyUrlParams } from './stringify_url_params';

describe('stringifyUrlParams', () => {
  const commonProps = {
    page: 1,
    perPage: 5,
    sortField: SortFieldCase.createdAt,
    sortOrder: 'desc' as const,
  };

  it('empty severity and status', () => {
    const urlParams = {
      ...commonProps,
      status: [],
      severity: [],
    };

    expect(stringifyUrlParams(urlParams)).toMatchInlineSnapshot(
      `"cases=(page:1,perPage:5,severity:!(),sortField:createdAt,sortOrder:desc,status:!())"`
    );
  });

  it('severity and status with one value', () => {
    const urlParams = {
      ...commonProps,
      status: [CaseStatuses.open],
      severity: [CaseSeverity.LOW],
    };

    expect(stringifyUrlParams(urlParams)).toMatchInlineSnapshot(
      `"cases=(page:1,perPage:5,severity:!(low),sortField:createdAt,sortOrder:desc,status:!(open))"`
    );
  });

  it('severity and status with multiple values', () => {
    const urlParams = {
      ...commonProps,
      status: [CaseStatuses.open, CaseStatuses.closed],
      severity: [CaseSeverity.LOW, CaseSeverity.HIGH],
    };

    expect(stringifyUrlParams(urlParams)).toMatchInlineSnapshot(
      `"cases=(page:1,perPage:5,severity:!(low,high),sortField:createdAt,sortOrder:desc,status:!(open,closed))"`
    );
  });

  it('severity and status are undefined', () => {
    const urlParams = {
      ...commonProps,
      status: undefined,
      severity: undefined,
    };

    expect(stringifyUrlParams(urlParams)).toMatchInlineSnapshot(
      `"cases=(page:1,perPage:5,sortField:createdAt,sortOrder:desc)"`
    );
  });

  it('severity and status are undefined but there are more filters to serialize', () => {
    const urlParams = {
      status: undefined,
      severity: undefined,
      ...commonProps,
    };

    expect(stringifyUrlParams(urlParams)).toMatchInlineSnapshot(
      `"cases=(page:1,perPage:5,sortField:createdAt,sortOrder:desc)"`
    );
  });

  it('encodes defaults correctly', () => {
    const { customFields, ...filterOptionsWithoutCustomFields } =
      DEFAULT_CASES_TABLE_STATE.filterOptions;

    const urlParams = {
      ...filterOptionsWithoutCustomFields,
      ...DEFAULT_CASES_TABLE_STATE.queryParams,
      customFields: { my_field: ['foo', 'bar'] },
    };

    expect(stringifyUrlParams(urlParams)).toMatchInlineSnapshot(
      `"cases=(assignees:!(),category:!(),customFields:(my_field:!(foo,bar)),owner:!(),page:1,perPage:10,reporters:!(),search:'',searchFields:!(title,description),severity:!(),sortField:createdAt,sortOrder:desc,status:!(),tags:!())"`
    );
  });

  it('replaces the cases query param correctly', () => {
    expect(
      stringifyUrlParams(
        {
          perPage: 100,
        },
        'cases=(perPage:5)'
      )
    ).toMatchInlineSnapshot(`"cases=(perPage:100)"`);
  });

  it('removes legacy keys from URL', () => {
    const search = 'status=foo&severity=foo&page=2&perPage=50&sortField=closedAt&sortOrder=asc';

    expect(
      stringifyUrlParams(
        {
          perPage: 100,
        },
        search
      )
    ).toMatchInlineSnapshot(`"cases=(perPage:100)"`);
  });

  it('keeps non cases state', () => {
    expect(
      stringifyUrlParams(
        {
          perPage: 100,
        },
        'foo=bar'
      )
    ).toMatchInlineSnapshot(`"cases=(perPage:100)&foo=bar"`);
  });
});
