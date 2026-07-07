/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@kbn/shared-ux-router';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { ExternalReferenceAttachmentTypeRegistry } from './client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from './client/attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from './client/attachment_framework/unified_attachment_registry';
import type { RenderAppProps } from './types';

import { CasesApp } from './components/app';

export const renderApp = (deps: RenderAppProps) => {
  const { mountParams } = deps;
  const { element } = mountParams;

  ReactDOM.render(<App deps={deps} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

interface CasesAppWithContextProps {
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
  getFilesClient: (scope: string) => ScopedFilesClient;
}

const CasesAppWithContext: React.FC<CasesAppWithContextProps> = React.memo(
  ({
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
    unifiedAttachmentTypeRegistry,
    getFilesClient,
  }) => {
    return (
      <CasesApp
        externalReferenceAttachmentTypeRegistry={externalReferenceAttachmentTypeRegistry}
        persistableStateAttachmentTypeRegistry={persistableStateAttachmentTypeRegistry}
        unifiedAttachmentTypeRegistry={unifiedAttachmentTypeRegistry}
        getFilesClient={getFilesClient}
      />
    );
  }
);

CasesAppWithContext.displayName = 'CasesAppWithContext';

export const App: React.FC<{ deps: RenderAppProps }> = ({ deps }) => {
  const { mountParams, coreStart, pluginsStart, storage, kibanaVersion } = deps;
  const { history } = mountParams;

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider
        services={{
          kibanaVersion,
          ...coreStart,
          ...pluginsStart,
          storage,
        }}
      >
        <Router history={history}>
          <CasesAppWithContext
            externalReferenceAttachmentTypeRegistry={deps.externalReferenceAttachmentTypeRegistry}
            persistableStateAttachmentTypeRegistry={deps.persistableStateAttachmentTypeRegistry}
            unifiedAttachmentTypeRegistry={deps.unifiedAttachmentTypeRegistry}
            getFilesClient={pluginsStart.files.filesClientFactory.asScoped}
          />
        </Router>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

App.displayName = 'App';
