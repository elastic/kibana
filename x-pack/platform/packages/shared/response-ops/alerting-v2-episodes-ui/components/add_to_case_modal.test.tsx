/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  closeAddToCaseModal,
  openAddToCaseModal,
  type AddToCaseCasesService,
} from './add_to_case_modal';

jest.mock('@kbn/react-kibana-mount', () => ({ toMountPoint: jest.fn() }));

const toMountPointMock = jest.mocked(toMountPoint);

const setup = () => {
  const unmount = jest.fn();
  let mountedNode: ReactNode;
  toMountPointMock.mockImplementation((node) => {
    mountedNode = node;
    return () => unmount;
  });

  const open = jest.fn();
  const modalProps: { onSuccess?: () => void; onClose?: (...args: unknown[]) => void } = {};
  const permissions = { create: true, read: true };
  const CasesContext = jest.fn(({ children }: { children?: ReactNode }) => <>{children}</>);
  const cases = {
    ui: { getCasesContext: jest.fn().mockReturnValue(CasesContext) },
    hooks: {
      useCasesAddToExistingCaseModal: jest.fn((props) => {
        Object.assign(modalProps, props);
        return { open };
      }),
    },
    helpers: { canUseCases: jest.fn().mockReturnValue(permissions), groupAlertsByRule: jest.fn() },
  } as unknown as AddToCaseCasesService;

  const getAttachments = jest.fn().mockReturnValue([]);
  const onSuccess = jest.fn();
  const noAttachmentsToaster = { title: 'none', content: 'all attached' };

  openAddToCaseModal(
    {
      cases,
      owner: 'observability',
      rendering: coreMock.createStart().rendering,
      kibanaServices: {},
    },
    { getAttachments, onSuccess, noAttachmentsToaster }
  );
  render(<>{mountedNode}</>);

  return {
    cases,
    CasesContext,
    permissions,
    open,
    modalProps,
    getAttachments,
    onSuccess,
    noAttachmentsToaster,
    unmount,
  };
};

describe('openAddToCaseModal', () => {
  afterEach(() => {
    closeAddToCaseModal();
  });

  it('renders the Cases context for the owner with the user permissions', () => {
    const { CasesContext, permissions, cases } = setup();

    expect(cases.helpers.canUseCases).toHaveBeenCalledWith(['observability']);
    expect(CasesContext.mock.calls[0][0]).toMatchObject({
      owner: ['observability'],
      permissions,
    });
  });

  it('opens the existing case modal once with the attachments getter', () => {
    const { open, getAttachments, cases, noAttachmentsToaster } = setup();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith({ getAttachments });
    expect(cases.hooks.useCasesAddToExistingCaseModal).toHaveBeenCalledWith(
      expect.objectContaining({ noAttachmentsToaster })
    );
  });

  it('forwards success to the caller and unmounts the Cases tree', () => {
    const { modalProps, onSuccess, unmount } = setup();

    modalProps.onSuccess?.();

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it('unmounts the Cases tree when the modal is dismissed', () => {
    const { modalProps, unmount } = setup();

    modalProps.onClose?.();

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it('unmounts the Cases tree when a case is selected', () => {
    const { modalProps, unmount } = setup();

    modalProps.onClose?.({ id: 'case-1' }, false);

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it('keeps the Cases tree mounted when the modal closes to create a case', () => {
    const { modalProps, unmount } = setup();

    modalProps.onClose?.(undefined, true);

    expect(unmount).not.toHaveBeenCalled();
  });

  it('unmounts the Cases tree only once', () => {
    const { modalProps, unmount } = setup();

    modalProps.onClose?.();
    modalProps.onSuccess?.();

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it('replaces an open modal instead of mounting a second root', () => {
    const first = setup();
    const second = setup();

    expect(first.unmount).toHaveBeenCalledTimes(1);
    expect(second.unmount).not.toHaveBeenCalled();
  });

  it('unmounts the open modal when the host app closes it', () => {
    const { unmount } = setup();

    closeAddToCaseModal();

    expect(unmount).toHaveBeenCalledTimes(1);
  });
});
