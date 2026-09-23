/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { RoleArnField, ROLE_ARN_FIELD_TEST_SUBJECTS } from './role_arn_field';

const noop = () => {};

describe('RoleArnField', () => {
  it('renders the stored value', () => {
    renderWithI18n(
      <RoleArnField
        value="arn:aws:iam::123456789012:role/MyRole"
        onChange={noop}
        affectedPackagePolicyCount={0}
      />
    );
    expect((screen.getByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.INPUT) as HTMLInputElement).value).toBe(
      'arn:aws:iam::123456789012:role/MyRole'
    );
  });

  it('trims the value on input so callers get the ARN they will save', () => {
    const onChange = jest.fn();
    renderWithI18n(
      <RoleArnField
        value="arn:aws:iam::123456789012:role/Old"
        onChange={onChange}
        affectedPackagePolicyCount={0}
      />
    );
    fireEvent.change(screen.getByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.INPUT), {
      target: { value: '  arn:aws:iam::123456789012:role/New  ' },
    });
    expect(onChange).toHaveBeenLastCalledWith('arn:aws:iam::123456789012:role/New');
  });

  it('shows the inline error text for an invalid value', () => {
    renderWithI18n(
      <RoleArnField value="not-an-arn" onChange={noop} affectedPackagePolicyCount={0} />
    );
    expect(screen.getByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.ERROR)).toBeInTheDocument();
  });

  it('renders the warning callout only when the value is edited and valid, with the count', () => {
    const { rerender } = renderWithI18n(
      <RoleArnField
        value="arn:aws:iam::123456789012:role/Old"
        storedValue="arn:aws:iam::123456789012:role/Old"
        onChange={noop}
        affectedPackagePolicyCount={3}
      />
    );
    expect(screen.queryByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.CALLOUT)).toBeNull();

    rerender(
      <I18nProvider>
        <RoleArnField
          value="arn:aws:iam::123456789012:role/New"
          storedValue="arn:aws:iam::123456789012:role/Old"
          onChange={noop}
          affectedPackagePolicyCount={3}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.CALLOUT)).toBeInTheDocument();
    expect(screen.getByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.CALLOUT).textContent).toMatch(
      /3 package policies/
    );
    expect(screen.getByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.CALLOUT).textContent).toMatch(
      /all of them stop collecting/
    );
  });

  it('says the count covers this space only when the identity is shared with other spaces', () => {
    renderWithI18n(
      <RoleArnField
        value="arn:aws:iam::123456789012:role/New"
        storedValue="arn:aws:iam::123456789012:role/Old"
        onChange={noop}
        affectedPackagePolicyCount={0}
        sharedWithOtherSpaces
      />
    );
    const text = screen.getByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.CALLOUT).textContent;
    expect(text).toMatch(/0 package policies in this space/);
    expect(text).toMatch(/policies that use it in other spaces/);
  });

  it('renders a neutral warning when the count is not yet known', () => {
    renderWithI18n(
      <RoleArnField
        value="arn:aws:iam::123456789012:role/New"
        storedValue="arn:aws:iam::123456789012:role/Old"
        onChange={noop}
        affectedPackagePolicyCount={undefined}
      />
    );
    expect(screen.getByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.CALLOUT).textContent).toMatch(
      /other integrations/i
    );
  });

  it('flags a cleared value: the role cannot be removed, and silently discarding it is worse', () => {
    renderWithI18n(
      <RoleArnField
        value=""
        storedValue="arn:aws:iam::123456789012:role/Old"
        onChange={noop}
        affectedPackagePolicyCount={2}
      />
    );
    expect(screen.getByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.ERROR).textContent).toMatch(/required/i);
    expect(screen.queryByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.CALLOUT)).toBeNull();
  });

  it('does not flag an empty field on an identity that has no stored role', () => {
    renderWithI18n(<RoleArnField value="" onChange={noop} affectedPackagePolicyCount={0} />);
    expect(screen.queryByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.ERROR)).toBeNull();
  });

  it('does not render the callout when the edited value is invalid', () => {
    renderWithI18n(
      <RoleArnField
        value="not-an-arn"
        storedValue="arn:aws:iam::123456789012:role/Old"
        onChange={noop}
        affectedPackagePolicyCount={2}
      />
    );
    expect(screen.queryByTestId(ROLE_ARN_FIELD_TEST_SUBJECTS.CALLOUT)).toBeNull();
  });
});
