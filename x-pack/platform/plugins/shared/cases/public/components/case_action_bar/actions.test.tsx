/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { noDeleteCasesPermissions, TestProviders } from '../../common/mock';
import { basicCase, basicPush } from '../../containers/mock';
import { Actions } from './actions';
import * as i18n from '../case_view/translations';
import * as api from '../../containers/api';
import { waitFor } from '@testing-library/react';
import { KibanaServices } from '../../common/lib/kibana';

jest.mock('../../containers/api');
jest.mock('./apply_template_modal', () => ({
  ApplyTemplateModal: () => <div data-test-subj="apply-template-modal" />,
}));

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

const defaultProps = {
  caseData: basicCase,
  currentExternalIncident: null,
};

describe('CaseView actions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('clicking trash toggles modal', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeFalsy();
    wrapper
      .find('button[data-test-subj="property-actions-case-ellipses"]')
      .first()
      .simulate('click');
    wrapper.find('button[data-test-subj="property-actions-case-trash"]').simulate('click');
    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeTruthy();
  });

  it('clicking copy icon copies case id', () => {
    const originalClipboard = global.window.navigator.clipboard;

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
      writable: true,
    });

    const wrapper = mount(
      <TestProviders>
        <Actions {...defaultProps} />
      </TestProviders>
    );

    wrapper
      .find('button[data-test-subj="property-actions-case-ellipses"]')
      .first()
      .simulate('click');
    wrapper.find('button[data-test-subj="property-actions-case-copy"]').simulate('click');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicCase.id);

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });

  it('does not show trash icon when user does not have deletion privileges', () => {
    const wrapper = mount(
      <TestProviders permissions={noDeleteCasesPermissions()}>
        <Actions {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeFalsy();
    wrapper
      .find('button[data-test-subj="property-actions-case-ellipses"]')
      .first()
      .simulate('click');
    expect(wrapper.find('[data-test-subj="property-actions-case-trash"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="property-actions-case-copy"]').exists()).toBeTruthy();
  });

  it('toggle delete modal and confirm', async () => {
    const deleteCasesSpy = jest
      .spyOn(api, 'deleteCases')
      .mockRejectedValue(new Error('useDeleteCases: Test error'));

    const wrapper = mount(
      <TestProviders>
        <Actions {...defaultProps} />
      </TestProviders>
    );

    wrapper
      .find('button[data-test-subj="property-actions-case-ellipses"]')
      .first()
      .simulate('click');
    wrapper.find('button[data-test-subj="property-actions-case-trash"]').simulate('click');

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeTruthy();
    wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').simulate('click');

    await waitFor(() => {
      expect(deleteCasesSpy).toHaveBeenCalledWith({ caseIds: ['basic-case-id'] });
    });
  });

  describe('Apply template action', () => {
    const enableTemplatesV2 = () =>
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

    it('does not show the apply template action when templates v2 is disabled', () => {
      jest.spyOn(KibanaServices, 'getConfig').mockReturnValue(undefined);

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      wrapper
        .find('button[data-test-subj="property-actions-case-ellipses"]')
        .first()
        .simulate('click');

      expect(
        wrapper.find('button[data-test-subj="property-actions-case-indexEdit"]').exists()
      ).toBeFalsy();
    });

    it('shows the apply template action when templates v2 is enabled', () => {
      enableTemplatesV2();

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      wrapper
        .find('button[data-test-subj="property-actions-case-ellipses"]')
        .first()
        .simulate('click');

      expect(
        wrapper.find('button[data-test-subj="property-actions-case-indexEdit"]').exists()
      ).toBeTruthy();
    });

    it('clicking apply template opens the modal', () => {
      enableTemplatesV2();

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="apply-template-modal"]').exists()).toBeFalsy();

      wrapper
        .find('button[data-test-subj="property-actions-case-ellipses"]')
        .first()
        .simulate('click');
      wrapper.find('button[data-test-subj="property-actions-case-indexEdit"]').simulate('click');

      expect(wrapper.find('[data-test-subj="apply-template-modal"]').exists()).toBeTruthy();
    });
  });

  it('displays active incident link', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          {...defaultProps}
          currentExternalIncident={{
            ...basicPush,
          }}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeFalsy();

    wrapper
      .find('button[data-test-subj="property-actions-case-ellipses"]')
      .first()
      .simulate('click');
    expect(
      wrapper.find('[data-test-subj="property-actions-case-external"]').first().prop('aria-label')
    ).toEqual(i18n.VIEW_INCIDENT(basicPush.externalTitle));
  });
});
