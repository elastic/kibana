/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { ComponentType, PropsWithChildren } from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

export type CasesOwner = 'securitySolution' | 'observability' | 'cases';

export interface CaseSummary {
  id: string;
  owner: string;
}

export interface CasesPermissions {
  create: boolean;
  read: boolean;
}

export interface CaseAlertItem {
  ecs: { _id: string; _index: string };
  data: Array<{ field: string; value: string[] }>;
}

export interface AddToCaseModalOptions<TAttachment = unknown> {
  getAttachments: (args: { theCase?: CaseSummary }) => TAttachment[];
  onSuccess: () => void;
  noAttachmentsToaster: { title: string; content: string };
}

/**
 * Minimal view of the Cases plugin start contract used to attach episodes to a
 * case. Declared locally, with method signatures so the real contract stays
 * assignable, to avoid depending on the Cases plugin from this package.
 */
export interface AddToCaseCasesService<
  TPermissions extends CasesPermissions = CasesPermissions,
  TAttachment = unknown
> {
  ui: {
    getCasesContext(): ComponentType<
      PropsWithChildren<{ owner: string[]; permissions: TPermissions }>
    >;
  };
  hooks: {
    useCasesAddToExistingCaseModal(props?: {
      onSuccess?: () => void;
      onClose?: (theCase?: unknown, isCreateCase?: boolean) => void;
      noAttachmentsToaster?: { title?: string; content?: string };
    }): {
      open(args: { getAttachments: AddToCaseModalOptions<TAttachment>['getAttachments'] }): void;
    };
  };
  helpers: {
    canUseCases(owners: CasesOwner[]): TPermissions;
    groupAlertsByRule(items: CaseAlertItem[], owner: string): TAttachment[];
  };
}

export interface OpenAddToCaseModalDeps<
  TPermissions extends CasesPermissions = CasesPermissions,
  TAttachment = unknown
> {
  cases: AddToCaseCasesService<TPermissions, TAttachment>;
  owner: CasesOwner;
  rendering: CoreStart['rendering'];
  /**
   * Kibana services consumed by the Cases components via `useKibana`. Forwarded
   * into a fresh `KibanaContextProvider` because the modal mounts in a separate
   * React root.
   */
  kibanaServices: Record<string, unknown>;
}

interface AddToCaseModalBridgeProps<TAttachment> extends AddToCaseModalOptions<TAttachment> {
  hooks: AddToCaseCasesService<CasesPermissions, TAttachment>['hooks'];
  onClose: (theCase?: unknown, isCreateCase?: boolean) => void;
}

const AddToCaseModalBridge = <TAttachment,>({
  hooks,
  getAttachments,
  noAttachmentsToaster,
  onSuccess,
  onClose,
}: AddToCaseModalBridgeProps<TAttachment>) => {
  const modal = hooks.useCasesAddToExistingCaseModal({
    onSuccess,
    onClose,
    noAttachmentsToaster,
  });

  useEffect(() => {
    modal.open({ getAttachments });
  }, [modal, getAttachments]);

  return null;
};

let activeCleanup: (() => void) | undefined;

/** Unmounts the open add-to-case modal, including when the host app unmounts. */
export const closeAddToCaseModal = (): void => {
  activeCleanup?.();
};

/**
 * Opens the Cases "add to existing case" modal from a surface that has no React
 * tree of its own, such as a table action invoked imperatively. The modal's
 * "Create new case" button hands off to the Cases flyout, so the root stays
 * mounted until a case is selected, created, or the user dismisses the flow.
 * A later open replaces the previous root.
 */
export const openAddToCaseModal = <TPermissions extends CasesPermissions, TAttachment>(
  { cases, owner, rendering, kibanaServices }: OpenAddToCaseModalDeps<TPermissions, TAttachment>,
  options: AddToCaseModalOptions<TAttachment>
): void => {
  closeAddToCaseModal();

  const CasesContext = cases.ui.getCasesContext();
  const permissions = cases.helpers.canUseCases([owner]);
  const container = document.createElement('div');
  document.body.appendChild(container);
  let unmount: (() => void) | undefined;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (activeCleanup === cleanup) {
      activeCleanup = undefined;
    }
    unmount?.();
    unmount = undefined;
    container.remove();
  };

  const onClose = (theCase?: unknown, isCreateCase?: boolean) => {
    /*
     * Creating a case closes the modal and then opens the flyout, so the root
     * has to outlive that close.
     */
    if (isCreateCase && theCase == null) return;
    cleanup();
  };

  const onSuccess = () => {
    options.onSuccess();
    cleanup();
  };

  activeCleanup = cleanup;

  try {
    unmount = toMountPoint(
      <KibanaContextProvider services={kibanaServices}>
        <CasesContext owner={[owner]} permissions={permissions}>
          <AddToCaseModalBridge
            hooks={cases.hooks}
            getAttachments={options.getAttachments}
            noAttachmentsToaster={options.noAttachmentsToaster}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        </CasesContext>
      </KibanaContextProvider>,
      rendering
    )(container);
  } catch (error) {
    cleanup();
    throw error;
  }
};
