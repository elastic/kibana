/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { mount } from 'enzyme';

import { CreateCaseModal } from './create_case_modal';
import { TestProviders } from '../../common/mock';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { CreateCase } from '../create';

vi.mock('../create', () => {
      const mocked = {
      CreateCase: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const CreateCaseMock = CreateCase as unknown as Mock;

const onCloseCaseModal = vi.fn();
const onSuccess = vi.fn();
const defaultProps = {
  isModalOpen: true,
  onCloseCaseModal,
  onSuccess,
  owner: SECURITY_SOLUTION_OWNER,
};

describe('CreateCaseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CreateCaseMock.mockReturnValue(<></>);
  });

  it('renders', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='create-case-modal']`).exists()).toBeTruthy();
  });

  it('it does not render the modal isModalOpen=false ', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} isModalOpen={false} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='create-case-modal']`).exists()).toBeFalsy();
  });

  it('Closing modal calls onCloseCaseModal', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button.euiModal__closeIcon').first().simulate('click');
    expect(onCloseCaseModal).toHaveBeenCalled();
  });

  it('pass the correct props to getCreateCase method', () => {
    mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} />
      </TestProviders>
    );

    expect(CreateCaseMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        onSuccess,
        onCancel: onCloseCaseModal,
      })
    );
  });
});
